const { getOpenAIFlash } = require('../config/openai');
const redisClient = require('../config/redis');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const googleTTSService = require('./googleTTSService');
const interviewAggregationService = require('./interviewAggregationService');
const QuestionAnalysis = require('../models/QuestionAnalysis');

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

class GeminiVoiceInterviewService {
  constructor() {
    this.redisClient = redisClient;
    this.SESSION_TTL = 3600; // 1 hour expiry for interview sessions
    this.LOCK_TTL = 10; // 10 seconds for distributed lock
    this.MIN_BASELINE_QUESTIONS = parsePositiveInt(process.env.MIN_BASELINE_QUESTIONS, 3);
    this.MAX_FOLLOWUPS_PER_PRIMARY = parsePositiveInt(process.env.MAX_FOLLOWUPS_PER_PRIMARY, 2);
    this.MAX_TOTAL_QUESTIONS = parsePositiveInt(process.env.MAX_TOTAL_QUESTIONS, 7);
  }

  /**
   * Store interview context in Redis
   */
  async setSessionContext(sessionId, context) {
    try {
      await this.redisClient.setex(
        `interview:${sessionId}`,
        this.SESSION_TTL,
        JSON.stringify(context)
      );
    } catch (error) {
      console.error(`❌ Error storing session ${sessionId} to Redis:`, error.message);
      throw error;
    }
  }

  /**
   * Retrieve interview context from Redis
   */
  async getSessionContext(sessionId) {
    try {
      const data = await this.redisClient.get(`interview:${sessionId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Error retrieving session ${sessionId} from Redis:`, error.message);
      return null;
    }
  }

  /**
   * Delete interview context from Redis
   */
  async deleteSessionContext(sessionId) {
    try {
      await this.redisClient.del(`interview:${sessionId}`);
    } catch (error) {
      console.error(`❌ Error deleting session ${sessionId} from Redis:`, error.message);
    }
  }

  /**
   * Simple distributed lock for concurrent writes (prevents race conditions in multi-instance)
   */
  async acquireLock(sessionId) {
    const lockKey = `lock:${sessionId}`;
    const lockId = Date.now().toString();
    try {
      // Try to set lock (NX = only if not exists)
      const result = await this.redisClient.set(lockKey, lockId, 'EX', this.LOCK_TTL, 'NX');
      return result ? lockId : null;
    } catch (error) {
      console.error(`Error acquiring lock for ${sessionId}:`, error.message);
      return null;
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(sessionId, lockId) {
    const lockKey = `lock:${sessionId}`;
    try {
      const storedLockId = await this.redisClient.get(lockKey);
      // Only delete if lock ID matches (prevent deletion of other locks)
      if (storedLockId === lockId) {
        await this.redisClient.del(lockKey);
      }
    } catch (error) {
      console.error(`Error releasing lock for ${sessionId}:`, error.message);
    }
  }

  /**
   * Read-modify-write with lock to prevent race conditions
   */
  async updateSessionContextWithLock(sessionId, updateFn) {
    let lockId = null;
    try {
      // Wait up to 2 seconds for lock
      let attempts = 0;
      while (!lockId && attempts < 20) {
        lockId = await this.acquireLock(sessionId);
        if (!lockId) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (!lockId) {
        console.warn(`⚠️ Could not acquire lock for ${sessionId}`);
        return null;
      }

      // Read current context
      const context = await this.getSessionContext(sessionId);
      if (!context) return null;

      // Apply update function
      const updatedContext = updateFn(context);

      // Write back to Redis
      await this.setSessionContext(sessionId, updatedContext);

      return updatedContext;
    } finally {
      if (lockId) {
        await this.releaseLock(sessionId, lockId);
      }
    }
  }

  /**
   * Initialize a new AI voice interview session
   */
  async initializeInterview(jobId, candidateName, options = {}) {
    try {
      let interviewContext;
      const { applicationId, candidateUserId, mockJobDetails } = options;

      let resolvedCandidateUserId = candidateUserId || null;
      if (!resolvedCandidateUserId && applicationId) {
        const application = await Application.findById(applicationId).select('candidateId').lean();
        resolvedCandidateUserId = application?.candidateId || null;
      }

      let resumeSkills = [];
      if (resolvedCandidateUserId) {
        const candidate = await Candidate.findOne({ userId: resolvedCandidateUserId })
          .select('skills')
          .lean();
        resumeSkills = (candidate?.skills || [])
          .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
          .filter(Boolean);
      }

      if (jobId && jobId !== 'practice') {
        // Real job application interview
        const job = await Job.findById(jobId);
        if (!job) {
          throw new Error('Job not found');
        }

        const requiredSkills = (job.requirements?.skills || [])
          .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
          .filter(Boolean);

        interviewContext = {
          jobTitle: job.title,
          companyName: job.companyId?.name || 'the company',
          description: job.description,
          requirements: job.requirements,
          requiredSkills,
          resumeSkills,
          skillCoverage: this.createInitialSkillCoverage(requiredSkills),
          optionalSkillCoverage: this.createInitialSkillCoverage(
            resumeSkills.filter((skill) => !requiredSkills.some((req) => this.normalizeSkill(req) === this.normalizeSkill(skill)))
          ),
          candidateName,
          conversationHistory: [],
          currentQuestionIndex: 0,
          minBaselineQuestions: this.MIN_BASELINE_QUESTIONS,
          maxFollowUpsPerPrimary: this.MAX_FOLLOWUPS_PER_PRIMARY,
          estimatedTotalQuestions: Math.max(requiredSkills.length + 2, this.MIN_BASELINE_QUESTIONS),
          currentTargetSkill: null,
          currentQuestionType: 'main',
          followUpsForCurrentPrimary: 0,
          completionConfidence: 0,
          completionReason: '',
          maxTotalQuestions: this.MAX_TOTAL_QUESTIONS
        };
      } else {
        // Practice interview
        const mockTitle = mockJobDetails?.jobTitle?.trim() || 'Practice Interview';
        const mockCompany = mockJobDetails?.companyName?.trim() || 'HirePrep';
        const mockDescription = mockJobDetails?.jobDescription?.trim()
          || 'This is a practice interview to help you prepare for real interviews. We will ask general behavioral and technical questions.';
        const mockRequiredSkills = Array.isArray(mockJobDetails?.requiredSkills)
          ? mockJobDetails.requiredSkills.filter(Boolean)
          : [];

        interviewContext = {
          jobTitle: mockTitle,
          companyName: mockCompany,
          description: mockDescription,
          requirements: mockRequiredSkills.length > 0
            ? `Required skills: ${mockRequiredSkills.join(', ')}`
            : 'General software engineering skills, problem-solving, communication',
          requiredSkills: mockRequiredSkills,
          resumeSkills,
          skillCoverage: this.createInitialSkillCoverage(mockRequiredSkills),
          optionalSkillCoverage: this.createInitialSkillCoverage(resumeSkills),
          candidateName,
          conversationHistory: [],
          currentQuestionIndex: 0,
          minBaselineQuestions: this.MIN_BASELINE_QUESTIONS,
          maxFollowUpsPerPrimary: this.MAX_FOLLOWUPS_PER_PRIMARY,
          estimatedTotalQuestions: 6,
          currentTargetSkill: null,
          currentQuestionType: 'main',
          followUpsForCurrentPrimary: 0,
          completionConfidence: 0,
          completionReason: '',
          maxTotalQuestions: this.MAX_TOTAL_QUESTIONS
        };
      }

      const sessionId = `${jobId || 'practice'}_${Date.now()}`;
      await this.setSessionContext(sessionId, interviewContext);

      return {
        sessionId,
        message: 'Interview session initialized'
      };
    } catch (error) {
      console.error('Error initializing interview:', error);
      throw error;
    }
  }

  /**
   * Generate next question using Gemini AI with natural context
   */
  async generateNextQuestion(sessionId) {
    try {
      let context = await this.getSessionContext(sessionId);

      if (!context) {
        // Session expired in Redis (e.g. backend restarted, TTL expired, or session lost).
        // Reconstruct a minimal context from persisted QuestionAnalysis docs (partial recovery).
        console.warn(`⚠️ [generateNextQuestion] Session ${sessionId} expired in Redis — falling back to partial MongoDB restore`);

        const pastQuestions = await QuestionAnalysis.find({ sessionId })
          .sort({ questionNumber: 1 })
          .lean();

        const conversationHistory = pastQuestions.flatMap(q => [
          { type: 'ai_question', content: q.questionText || `Question ${q.questionNumber}` },
          { type: 'candidate_answer', content: q.answerText || '' }
        ]);

        context = {
          jobTitle: 'Software Engineer',
          companyName: 'the company',
          description: 'General software engineering role',
          requirements: 'Problem-solving, communication, and technical skills',
          requiredSkills: [],
          resumeSkills: [],
          skillCoverage: {},
          optionalSkillCoverage: {},
          candidateName: 'Candidate',
          conversationHistory,
          currentQuestionIndex: pastQuestions.length,
          minBaselineQuestions: this.MIN_BASELINE_QUESTIONS,
          maxFollowUpsPerPrimary: this.MAX_FOLLOWUPS_PER_PRIMARY,
          estimatedTotalQuestions: 6,
          currentTargetSkill: null,
          currentQuestionType: 'main',
          followUpsForCurrentPrimary: 0,
          completionConfidence: 0,
          completionReason: '',
          maxTotalQuestions: this.MAX_TOTAL_QUESTIONS
        };

        // Cache it in Redis so subsequent calls can access it
        await this.setSessionContext(sessionId, context);
      }

      const model = getOpenAIFlash();
      const questionPlan = this.determineNextQuestionPlan(context);
      const prompt = this.buildInterviewPrompt(context, questionPlan);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const question = response.text().trim().replace(/^"|"$/g, '');

      context.currentTargetSkill = questionPlan.targetSkill || null;
      context.currentQuestionType = questionPlan.questionType;
      if (questionPlan.questionType === 'main') {
        context.followUpsForCurrentPrimary = 0;
      } else {
        context.followUpsForCurrentPrimary += 1;
      }

      // Update conversation history
      context.conversationHistory.push({
        type: 'ai_question',
        content: question,
        targetSkill: context.currentTargetSkill,
        questionType: context.currentQuestionType,
        timestamp: new Date()
      });
      context.currentQuestionIndex++;

      await this.setSessionContext(sessionId, context);

      return {
        question,
        questionNumber: context.currentQuestionIndex,
        totalQuestions: context.estimatedTotalQuestions,
        estimatedTotalQuestions: context.estimatedTotalQuestions,
        questionType: context.currentQuestionType,
        targetSkill: context.currentTargetSkill,
        completionConfidence: context.completionConfidence || 0,
        sessionId,
        hasAudio: true // Indicate that audio can be generated
      };
    } catch (error) {
      console.error('Error generating question:', error);
      throw error;
    }
  }

  /**
   * Generate audio for a question using Google TTS
   */
  async generateQuestionAudio(questionText, voiceType = 'professional_female') {
    try {
      // Map voice types to Google voices
      const voiceMap = {
        'professional_female': 'en-US-Neural2-F',
        'professional_male': 'en-US-Neural2-D',
        'casual_female': 'en-US-Standard-F',
        'casual_male': 'en-US-Standard-I'
      };

      const voiceName = voiceMap[voiceType] || 'en-US-Neural2-F';
      
      const audioBuffer = await googleTTSService.textToSpeech(
        questionText,
        'en-US',
        voiceName
      );

      return audioBuffer;
    } catch (error) {
      console.error('Error generating audio:', error);
      throw error;
    }
  }

  /**
   * Build dynamic interview prompt based on conversation history
   */
  buildInterviewPrompt(context, questionPlan) {
    const { jobTitle, companyName, description, requirements, conversationHistory } = context;
    const requirementsText = Array.isArray(requirements)
      ? requirements.join(', ')
      : (typeof requirements === 'string' ? requirements : JSON.stringify(requirements || {}));
    const requiredCoverage = Object.values(context.skillCoverage || {}).filter((s) => s.evaluated).length;
    const requiredTotal = Object.keys(context.skillCoverage || {}).length;

    let prompt = `You are an AI interviewer conducting a screening interview for the position of ${jobTitle} at ${companyName}.

Job Description: ${description}
Key Requirements: ${requirementsText}
Required skill coverage so far: ${requiredCoverage}/${requiredTotal}

`;

    if (conversationHistory.length === 0) {
      prompt += `This is the first question. Start with a warm greeting and ask an opening question about their background or motivation for applying.

Generate ONE clear, conversational question. Keep it natural and friendly. Don't use numbering or labels.`;
    } else {
      // Show previous conversation
      prompt += `Previous conversation:\n`;
      conversationHistory.slice(-4).forEach(item => {
        if (item.type === 'ai_question') {
          prompt += `AI: ${item.content}\n`;
        } else if (item.type === 'candidate_answer') {
          prompt += `Candidate: ${item.content}\n`;
        }
      });

      prompt += `\nBased on their previous answer, generate the next relevant interview question.

    Question plan:
    - Type: ${questionPlan.questionType}
    - Target skill/topic: ${questionPlan.targetSkill || 'general competency'}
    - Focus: ${questionPlan.focus || 'assess practical ability and confidence'}

The question should:
- Be conversational and natural
- Relate to the job requirements
- Consider their previous answers if relevant
- Be clear and concise
- Probe depth where uncertainty remains about their actual ability

    If this is a follow-up question, it MUST be a deeper probe on the SAME target skill and should not switch topic.
    If this is a main question, it MUST switch to the target skill/topic and avoid repeating the previous exact question.

Generate ONLY the question text, no labels or numbers.`;
    }

    return prompt;
  }

  /**
   * Process candidate's answer with behavioral data
   */
  async processAnswer(sessionId, answerText, behavioralData = null) {
    try {
      const context = await this.getSessionContext(sessionId);
      if (!context) {
        // Session expired in Redis (e.g. backend restarted) — behavioral data
        // is already persisted to MongoDB by the controller. Non-fatal.
        console.warn(`⚠️ [processAnswer] Session ${sessionId} expired in Redis — skipping history update`);
        return { success: true, message: 'Answer recorded (session not in memory)' };
      }

      // Add answer to conversation history with behavioral data
      const answerEntry = {
        type: 'candidate_answer',
        content: answerText,
        timestamp: new Date()
      };

      // Attach behavioral analysis if provided
      if (behavioralData) {
        answerEntry.behavioralAnalysis = {
          videoScore: behavioralData.videoScore || 0,
          audioScore: behavioralData.audioScore || 0,
          overallBehavioralScore: behavioralData.overallBehavioralScore || 0,
          cheatingIndicators: behavioralData.cheatingIndicators || {},
          metrics: behavioralData.detailedMetrics || {}
        };
      }

      context.conversationHistory.push(answerEntry);

      const latestSkill = context.currentTargetSkill;
      const latestQuestionType = context.currentQuestionType;
      const skillEvaluation = await this.evaluateSkillCoverage(
        context,
        latestSkill,
        latestQuestionType,
        answerText
      );

      if (latestSkill) {
        this.updateSkillCoverage(context, latestSkill, skillEvaluation, latestQuestionType);
      }

      const completionAssessment = await this.assessInterviewCompletion(context);
      context.estimatedTotalQuestions = completionAssessment.estimatedTotalQuestions;
      context.completionConfidence = completionAssessment.confidence;
      context.completionReason = completionAssessment.reason;

      await this.setSessionContext(sessionId, context);

      return {
        success: true,
        message: 'Answer and behavioral data recorded',
        shouldComplete: completionAssessment.shouldComplete,
        completionReason: completionAssessment.reason,
        confidence: completionAssessment.confidence,
        questionCount: completionAssessment.questionsAsked,
        estimatedTotalQuestions: completionAssessment.estimatedTotalQuestions,
        requiredSkillCoverage: completionAssessment.requiredSkillCoverage,
        evaluatedRequiredSkills: completionAssessment.evaluatedRequiredSkills,
        totalRequiredSkills: completionAssessment.totalRequiredSkills
      };
    } catch (error) {
      console.error('Error processing answer:', error);
      throw error;
    }
  }

  async assessInterviewCompletion(context) {
    const questionsAsked = context.conversationHistory.filter(
      (item) => item.type === 'candidate_answer'
    ).length;

    const minQuestions = context.minBaselineQuestions || this.MIN_BASELINE_QUESTIONS;
    const maxQuestions = context.maxTotalQuestions || this.MAX_TOTAL_QUESTIONS;
    const requiredSkills = Object.keys(context.skillCoverage || {});
    const evaluatedRequired = requiredSkills.filter((skill) => context.skillCoverage[skill]?.evaluated);

    // Hard safety cap: never allow interview loops beyond configured max.
    if (questionsAsked >= maxQuestions) {
      return {
        shouldComplete: true,
        reason: `Interview completed after reaching maximum question limit (${maxQuestions})`,
        confidence: 90,
        questionsAsked,
        estimatedTotalQuestions: questionsAsked,
        requiredSkillCoverage: requiredSkills.length > 0 ? Math.round((evaluatedRequired.length / requiredSkills.length) * 100) : 100,
        evaluatedRequiredSkills: evaluatedRequired.length,
        totalRequiredSkills: requiredSkills.length
      };
    }

    if (questionsAsked < minQuestions) {
      return {
        shouldComplete: false,
        reason: `Continue baseline probing to establish candidate ability`,
        confidence: 0,
        questionsAsked,
        estimatedTotalQuestions: Math.max(minQuestions + 1, context.estimatedTotalQuestions || 6),
        requiredSkillCoverage: requiredSkills.length > 0 ? Math.round((evaluatedRequired.length / requiredSkills.length) * 100) : 0,
        evaluatedRequiredSkills: evaluatedRequired.length,
        totalRequiredSkills: requiredSkills.length
      };
    }

    if (requiredSkills.length > 0 && evaluatedRequired.length < requiredSkills.length) {
      return {
        shouldComplete: false,
        reason: `Continue until all required job skills are evaluated`,
        confidence: 0,
        questionsAsked,
        estimatedTotalQuestions: Math.max(context.estimatedTotalQuestions || 6, questionsAsked + 1),
        requiredSkillCoverage: Math.round((evaluatedRequired.length / requiredSkills.length) * 100),
        evaluatedRequiredSkills: evaluatedRequired.length,
        totalRequiredSkills: requiredSkills.length
      };
    }

    // Deterministic completion once required skills are covered and we have enough evidence.
    const requiredCoverageComplete = requiredSkills.length === 0 || evaluatedRequired.length >= requiredSkills.length;
    const targetWhenCovered = Math.min(maxQuestions, Math.max(minQuestions, requiredSkills.length + 2));
    if (requiredCoverageComplete && questionsAsked >= targetWhenCovered) {
      return {
        shouldComplete: true,
        reason: `Required skills covered with sufficient depth`,
        confidence: 85,
        questionsAsked,
        estimatedTotalQuestions: questionsAsked,
        requiredSkillCoverage: requiredSkills.length > 0 ? Math.round((evaluatedRequired.length / requiredSkills.length) * 100) : 100,
        evaluatedRequiredSkills: evaluatedRequired.length,
        totalRequiredSkills: requiredSkills.length
      };
    }

    try {
      const model = getOpenAIFlash();
      const requirementsText = Array.isArray(context.requirements)
        ? context.requirements.join(', ')
        : (typeof context.requirements === 'string'
          ? context.requirements
          : JSON.stringify(context.requirements || {}));

      const transcript = context.conversationHistory
        .map((item) => {
          if (item.type === 'ai_question') return `Interviewer: ${item.content}`;
          if (item.type === 'candidate_answer') return `Candidate: ${item.content}`;
          return '';
        })
        .filter(Boolean)
        .join('\n');

      const prompt = `You are deciding whether an interview has gathered enough evidence to estimate candidate ability accurately.

Role: ${context.jobTitle}
Requirements: ${requirementsText}
Questions asked so far: ${questionsAsked}
Minimum questions required: ${minQuestions}
All required skills covered: ${requiredSkills.length > 0 ? 'yes' : 'not applicable'}

Transcript:
${transcript}

Return valid JSON only with keys:
{
  "shouldComplete": true|false,
  "confidence": 0-100,
  "reason": "brief explanation",
  "estimatedTotalQuestions": number >= ${questionsAsked}
}

Rules:
- Set shouldComplete=true only if confidence >= 80 and evidence is sufficient across communication + role-relevant depth.
- If uncertain, set shouldComplete=false and increase estimatedTotalQuestions.
- Keep estimatedTotalQuestions >= questions asked + 1 when shouldComplete=false.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);

      const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
      const estimated = Math.max(
        minQuestions,
        Number(parsed.estimatedTotalQuestions) || Math.max(questionsAsked + 1, minQuestions + 1)
      );
      const shouldComplete = Boolean(parsed.shouldComplete) && confidence >= 80;

      return {
        shouldComplete,
        confidence,
        reason: parsed.reason || (shouldComplete ? 'Sufficient confidence achieved' : 'Need additional evidence'),
        questionsAsked,
        estimatedTotalQuestions: shouldComplete ? questionsAsked : Math.max(estimated, questionsAsked + 1),
        requiredSkillCoverage: requiredSkills.length > 0 ? Math.round((evaluatedRequired.length / requiredSkills.length) * 100) : 100,
        evaluatedRequiredSkills: evaluatedRequired.length,
        totalRequiredSkills: requiredSkills.length
      };
    } catch (error) {
      console.warn('⚠️ Completion assessment fallback due to parse/model error:', error.message);

      if (questionsAsked >= maxQuestions - 1) {
        return {
          shouldComplete: true,
          confidence: 80,
          reason: 'Completion fallback triggered near max question limit',
          questionsAsked,
          estimatedTotalQuestions: questionsAsked,
          requiredSkillCoverage: requiredSkills.length > 0 ? Math.round((evaluatedRequired.length / requiredSkills.length) * 100) : 100,
          evaluatedRequiredSkills: evaluatedRequired.length,
          totalRequiredSkills: requiredSkills.length
        };
      }

      return {
        shouldComplete: false,
        confidence: 0,
        reason: 'Could not confidently assess completion, continuing interview',
        questionsAsked,
        estimatedTotalQuestions: Math.max(questionsAsked + 1, context.estimatedTotalQuestions || 6),
        requiredSkillCoverage: requiredSkills.length > 0 ? Math.round((evaluatedRequired.length / requiredSkills.length) * 100) : 100,
        evaluatedRequiredSkills: evaluatedRequired.length,
        totalRequiredSkills: requiredSkills.length
      };
    }
  }

  createInitialSkillCoverage(skills = []) {
    const coverage = {};
    skills.forEach((skill) => {
      const key = this.normalizeSkill(skill);
      coverage[key] = {
        displayName: skill,
        askedCount: 0,
        followUpsAsked: 0,
        evaluated: false,
        confidenceScores: []
      };
    });
    return coverage;
  }

  normalizeSkill(skill = '') {
    return String(skill).trim().toLowerCase();
  }

  determineNextQuestionPlan(context) {
    const requiredCoverage = context.skillCoverage || {};
    const requiredSkills = Object.keys(requiredCoverage);
    const currentSkill = this.normalizeSkill(context.currentTargetSkill || '');

    if (
      currentSkill &&
      requiredCoverage[currentSkill] &&
      !requiredCoverage[currentSkill].evaluated &&
      context.followUpsForCurrentPrimary < (context.maxFollowUpsPerPrimary || this.MAX_FOLLOWUPS_PER_PRIMARY)
    ) {
      return {
        questionType: 'followup',
        targetSkill: requiredCoverage[currentSkill].displayName,
        focus: 'clarify depth, practical implementation, and decision-making'
      };
    }

    const uncoveredRequired = requiredSkills
      .filter((skill) => !requiredCoverage[skill].evaluated)
      .sort((a, b) => (requiredCoverage[a].askedCount || 0) - (requiredCoverage[b].askedCount || 0));

    if (uncoveredRequired.length > 0) {
      return {
        questionType: 'main',
        targetSkill: requiredCoverage[uncoveredRequired[0]].displayName,
        focus: 'evaluate core required skill for the role'
      };
    }

    const optionalCoverage = context.optionalSkillCoverage || {};
    const uncoveredOptional = Object.keys(optionalCoverage)
      .filter((skill) => !optionalCoverage[skill].evaluated)
      .sort((a, b) => (optionalCoverage[a].askedCount || 0) - (optionalCoverage[b].askedCount || 0));

    if (uncoveredOptional.length > 0 && (context.completionConfidence || 0) < 85) {
      return {
        questionType: 'main',
        targetSkill: optionalCoverage[uncoveredOptional[0]].displayName,
        focus: 'validate additional resume skill and transferable depth'
      };
    }

    return {
      questionType: 'main',
      targetSkill: null,
      focus: 'final competency validation and role fit'
    };
  }

  updateSkillCoverage(context, skill, evaluation, questionType) {
    if (!skill) return;
    const normalized = this.normalizeSkill(skill);
    const coverageSet = context.skillCoverage[normalized]
      ? context.skillCoverage
      : context.optionalSkillCoverage;

    if (!coverageSet[normalized]) {
      coverageSet[normalized] = {
        displayName: skill,
        askedCount: 0,
        followUpsAsked: 0,
        evaluated: false,
        confidenceScores: []
      };
    }

    const skillState = coverageSet[normalized];
    skillState.askedCount += 1;
    if (questionType === 'followup') skillState.followUpsAsked += 1;
    if (Number.isFinite(evaluation.confidence)) skillState.confidenceScores.push(evaluation.confidence);
    if (evaluation.skillEvaluated) skillState.evaluated = true;
  }

  async evaluateSkillCoverage(context, targetSkill, questionType, answerText) {
    const normalizedTarget = this.normalizeSkill(targetSkill || '');
    if (!normalizedTarget) {
      return {
        skillEvaluated: answerText.length > 80,
        confidence: Math.min(95, Math.max(30, Math.round(answerText.length / 4)))
      };
    }

    const lastQuestion = [...context.conversationHistory]
      .reverse()
      .find((item) => item.type === 'ai_question');

    try {
      const model = getOpenAIFlash();
      const prompt = `Evaluate whether the candidate response is sufficient to assess their ability in skill: ${targetSkill}.

Question type: ${questionType}
Question: ${lastQuestion?.content || ''}
Answer: ${answerText}

Return valid JSON only with keys:
{
  "skillEvaluated": true|false,
  "confidence": 0-100,
  "reason": "brief"
}

Rules:
- skillEvaluated=true only if answer demonstrates practical understanding or concrete experience.
- If answer is vague/theoretical only, set skillEvaluated=false.
- confidence reflects certainty about candidate ability for this skill.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(text);

      return {
        skillEvaluated: Boolean(parsed.skillEvaluated),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
        reason: parsed.reason || ''
      };
    } catch (error) {
      console.warn('⚠️ Skill coverage evaluation fallback:', error.message);
      return {
        skillEvaluated: answerText.length > 120,
        confidence: Math.min(90, Math.max(25, Math.round(answerText.length / 5))),
        reason: 'fallback heuristic'
      };
    }
  }

  /**
   * Generate final analysis and combined score (content + behavioral + proctoring)
   * Behavioral scores (video + audio) come from MongoDB aggregation.
   * Content score comes from Gemini evaluating the full transcript.
   * Final = 35% content + 25% video + 25% audio + 15% proctoring
   */
  async generateFinalAnalysis(sessionId, proctoringStats = {}) {
    try {
      const context = await this.getSessionContext(sessionId);

      // ── 1. Aggregate video + audio scores from MongoDB ──────────────────
      const behavioralAgg = await interviewAggregationService.aggregateFinalScores(sessionId);
      const avgVideoScore = behavioralAgg.videoScore;
      const avgAudioScore = behavioralAgg.audioScore;
      const avgBehavioralScore = Math.round((avgVideoScore + avgAudioScore) / 2);
      const hasCheatingIndicators = behavioralAgg.hasCheatingIndicators;

      console.log(`📊 [FinalAnalysis] MongoDB aggregation: video=${avgVideoScore}, audio=${avgAudioScore}`);

      // ── 2. Build transcript for Gemini content scoring ───────────────────
      // Use in-memory context if available, otherwise build a minimal prompt
      let transcriptLines = '';
      let jobTitle = 'the position';
      let requirements = 'general professional skills';

      if (context) {
        jobTitle = context.jobTitle || jobTitle;
        requirements = Array.isArray(context.requirements)
          ? context.requirements.join(', ')
          : (context.requirements || requirements);

        transcriptLines = context.conversationHistory.map(item => {
          if (item.type === 'ai_question')    return `Interviewer: ${item.content}`;
          if (item.type === 'candidate_answer') return `Candidate: ${item.content}`;
          return '';
        }).filter(Boolean).join('\n');
      } else {
        // Session not in memory (backend restart) — pull real Q&A from MongoDB
        const QuestionAnalysis = require('../models/QuestionAnalysis');
        const questions = await QuestionAnalysis.find({ sessionId }).sort({ questionNumber: 1 }).lean();
        transcriptLines = questions.map(q => {
          const lines = [];
          if (q.questionText) lines.push(`Interviewer: ${q.questionText}`);
          if (q.answerText)   lines.push(`Candidate: ${q.answerText}`);
          return lines.join('\n');
        }).filter(Boolean).join('\n');
        console.warn('⚠️ [FinalAnalysis] Session not in memory — using MongoDB transcript');
      }

      // ── 3. Gemini evaluates answer CONTENT (transcript only) ─────────────
      const model = getOpenAIFlash();
      const analysisPrompt = `You are an expert hiring manager analysing an interview for the position of ${jobTitle}.

Key Requirements: ${requirements}

Interview Transcript:
${transcriptLines || '(No transcript available)'}

Provide a detailed analysis with:
1. Overall Content Score (0-100) — based ONLY on answer quality, technical knowledge, problem solving
2. Communication Skills Score (0-100)
3. Technical Knowledge Score (0-100)
4. Problem Solving Score (0-100)
5. Cultural Fit Score (0-100)
6. Strengths (bullet points)
7. Areas for Improvement (bullet points)
8. Key Insights
9. Overall Recommendation (Highly Recommended / Recommended / Consider / Not Recommended)

Format your response as JSON with keys: contentScore, communicationScore, technicalScore, problemSolvingScore, culturalFitScore, strengths (array), improvements (array), insights (string), recommendation (string)`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      let analysisText = response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch {
        console.error('Failed to parse Gemini JSON — using defaults');
        analysis = {
          contentScore: 75,
          communicationScore: 75,
          technicalScore: 70,
          problemSolvingScore: 75,
          culturalFitScore: 80,
          strengths: ['Participated in the interview'],
          improvements: ['Could provide more detailed answers'],
          insights: 'The candidate completed the interview and provided responses.',
          recommendation: 'Consider'
        };
      }

      const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
      const tabSwitches = safeNumber(proctoringStats.tabSwitches);
      const appSwitches = safeNumber(proctoringStats.appSwitches);
      const totalSwitches = safeNumber(proctoringStats.totalSwitches || (tabSwitches + appSwitches));
      const proctoringPenalty = (tabSwitches * 12) + (appSwitches * 8);
      const proctoringScore = Math.max(0, Math.min(100, Math.round(100 - proctoringPenalty)));

      // ── 4. Combine weighted scores ─────────────────
      const contentScore = Math.round(analysis.contentScore || 75);
      const finalScore = Math.round(
        (contentScore     * 0.35) +
        (avgVideoScore    * 0.25) +
        (avgAudioScore    * 0.25) +
        (proctoringScore  * 0.15)
      );

      console.log(`🎯 [FinalAnalysis] Scores — content: ${contentScore}, video: ${avgVideoScore}, audio: ${avgAudioScore}, proctoring: ${proctoringScore} → final: ${finalScore}`);

      analysis.overallScore     = finalScore;
      analysis.contentScore     = contentScore;
      analysis.videoScore       = Math.round(avgVideoScore);
      analysis.audioScore       = Math.round(avgAudioScore);
      analysis.behavioralScore  = Math.round(avgBehavioralScore);

      let proctoringRiskLevel = 'low';
      if (totalSwitches >= 5) proctoringRiskLevel = 'high';
      else if (totalSwitches >= 2) proctoringRiskLevel = 'medium';

      analysis.proctoring = {
        tabSwitches,
        appSwitches,
        totalSwitches,
        proctoringScore,
        riskLevel: proctoringRiskLevel
      };

      // Behavioral insights
      analysis.behavioralInsights = {
        eyeContact:  avgVideoScore > 70 ? 'Good'  : avgVideoScore > 50 ? 'Moderate' : 'Needs Improvement',
        confidence:  avgAudioScore > 70 ? 'Confident' : avgAudioScore > 50 ? 'Moderate' : 'Nervous',
        engagement:  avgBehavioralScore > 70 ? 'Highly Engaged' : avgBehavioralScore > 50 ? 'Engaged' : 'Low Engagement',
        questionsWithVideoAnalysis: behavioralAgg.videoQuestionsAnalyzed,
        questionsWithAudioAnalysis: behavioralAgg.audioQuestionsAnalyzed,
        breakdown: behavioralAgg.breakdown,
        emotionDistribution: behavioralAgg.emotionDistribution
      };

      if (hasCheatingIndicators) {
        analysis.integrityWarning = '⚠️ Potential integrity concerns detected during the interview';
        analysis.recommendation   = 'Requires Further Review';
      }

      if (totalSwitches >= 5) {
        analysis.integrityWarning = `⚠️ Proctoring red flag: ${totalSwitches} tab/app switches detected`;
        analysis.recommendation = 'Requires Further Review';
      } else if (totalSwitches === 1) {
        analysis.insights = `${analysis.insights || ''} One focus switch was detected and treated as potentially accidental.`.trim();
      }

      // Clean up Redis session
      if (context) await this.deleteSessionContext(sessionId);

      return analysis;
    } catch (error) {
      console.error('Error generating final analysis:', error);
      throw error;
    }
  }

  /**
   * Get interview progress
   */
  async getInterviewProgress(sessionId) {
    const context = await this.getSessionContext(sessionId);
    if (!context) {
      return null;
    }

    return {
      currentQuestion: context.currentQuestionIndex,
      totalQuestions: context.estimatedTotalQuestions,
      estimatedTotalQuestions: context.estimatedTotalQuestions,
      completionConfidence: context.completionConfidence || 0,
      completionReason: context.completionReason || '',
      requiredSkillCoverage: context.skillCoverage || {},
      conversationHistory: context.conversationHistory
    };
  }

  /**
   * End interview session
   */
  async endInterview(sessionId) {
    await this.deleteSessionContext(sessionId);
  }
}

module.exports = new GeminiVoiceInterviewService();
