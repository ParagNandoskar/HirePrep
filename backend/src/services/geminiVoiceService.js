const { getGrokFlash } = require('../config/grok');
const Job = require('../models/Job');
const googleTTSService = require('./googleTTSService');
const interviewAggregationService = require('./interviewAggregationService');
const QuestionAnalysis = require('../models/QuestionAnalysis');

class GeminiVoiceInterviewService {
  constructor() {
    this.activeInterviews = new Map();
  }

  /**
   * Initialize a new AI voice interview session
   */
  async initializeInterview(jobId, candidateName) {
    try {
      let interviewContext;

      if (jobId && jobId !== 'practice') {
        // Real job application interview
        const job = await Job.findById(jobId);
        if (!job) {
          throw new Error('Job not found');
        }

        interviewContext = {
          jobTitle: job.title,
          companyName: job.companyId?.name || 'the company',
          description: job.description,
          requirements: job.requirements,
          candidateName,
          conversationHistory: [],
          currentQuestionIndex: 0
        };
      } else {
        // Practice interview
        interviewContext = {
          jobTitle: 'Practice Interview',
          companyName: 'HirePrep',
          description: 'This is a practice interview to help you prepare for real interviews. We will ask general behavioral and technical questions.',
          requirements: 'General software engineering skills, problem-solving, communication',
          candidateName,
          conversationHistory: [],
          currentQuestionIndex: 0
        };
      }

      const sessionId = `${jobId || 'practice'}_${Date.now()}`;
      this.activeInterviews.set(sessionId, interviewContext);

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
      let context = this.activeInterviews.get(sessionId);

      if (!context) {
        // Session not in memory (e.g. backend restarted or hot-reload).
        // Reconstruct a minimal context from persisted QuestionAnalysis docs.
        console.warn(`⚠️ [generateNextQuestion] Session ${sessionId} not in memory — reconstructing from MongoDB`);

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
          candidateName: 'Candidate',
          conversationHistory,
          currentQuestionIndex: pastQuestions.length
        };

        // Cache it so subsequent calls within this request lifecycle are fast
        this.activeInterviews.set(sessionId, context);
      }

      const model = getGrokFlash();
      
      const prompt = this.buildInterviewPrompt(context);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const question = response.text();

      // Update conversation history
      context.conversationHistory.push({
        type: 'ai_question',
        content: question,
        timestamp: new Date()
      });
      context.currentQuestionIndex++;

      this.activeInterviews.set(sessionId, context);

      return {
        question,
        questionNumber: context.currentQuestionIndex,
        totalQuestions: 5,
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
  buildInterviewPrompt(context) {
    const { jobTitle, companyName, description, requirements, conversationHistory, currentQuestionIndex } = context;

    let prompt = `You are an AI interviewer conducting a screening interview for the position of ${jobTitle} at ${companyName}.

Job Description: ${description}
Key Requirements: ${Array.isArray(requirements) ? requirements.join(', ') : requirements}

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

      if (currentQuestionIndex >= 5) {
        prompt += `\nThis is the final question. Wrap up with a closing statement thanking them for their time.`;
      } else {
        prompt += `\nBased on their previous answer, generate the next relevant question (Question ${currentQuestionIndex + 1} of 5).
        
The question should:
- Be conversational and natural
- Relate to the job requirements
- Consider their previous answers if relevant
- Be clear and concise

Generate ONLY the question text, no labels or numbers.`;
      }
    }

    return prompt;
  }

  /**
   * Process candidate's answer with behavioral data
   */
  async processAnswer(sessionId, answerText, behavioralData = null) {
    try {
      const context = this.activeInterviews.get(sessionId);
      if (!context) {
        // Session not in memory (e.g. backend restarted) — behavioral data
        // is already persisted to MongoDB by the controller. Non-fatal.
        console.warn(`⚠️ [processAnswer] Session ${sessionId} not in memory — skipping history update`);
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

      this.activeInterviews.set(sessionId, context);

      return {
        success: true,
        message: 'Answer and behavioral data recorded'
      };
    } catch (error) {
      console.error('Error processing answer:', error);
      throw error;
    }
  }

  /**
   * Generate final analysis and combined score (content + behavioral)
   * Behavioral scores (video + audio) come from MongoDB aggregation.
   * Content score comes from Gemini evaluating the full transcript.
   * Final = 40% content + 30% video + 30% audio
   */
  async generateFinalAnalysis(sessionId) {
    try {
      const context = this.activeInterviews.get(sessionId);

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
      const model = getGrokFlash();
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

      // ── 4. Combine: 40% content + 30% video + 30% audio ─────────────────
      const contentScore = Math.round(analysis.contentScore || 75);
      const finalScore = Math.round(
        (contentScore     * 0.40) +
        (avgVideoScore    * 0.30) +
        (avgAudioScore    * 0.30)
      );

      console.log(`🎯 [FinalAnalysis] Scores — content: ${contentScore}, video: ${avgVideoScore}, audio: ${avgAudioScore} → final: ${finalScore}`);

      analysis.overallScore     = finalScore;
      analysis.contentScore     = contentScore;
      analysis.videoScore       = Math.round(avgVideoScore);
      analysis.audioScore       = Math.round(avgAudioScore);
      analysis.behavioralScore  = Math.round(avgBehavioralScore);

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

      // Clean up in-memory session
      if (context) this.activeInterviews.delete(sessionId);

      return analysis;
    } catch (error) {
      console.error('Error generating final analysis:', error);
      throw error;
    }
  }

  /**
   * Get interview progress
   */
  getInterviewProgress(sessionId) {
    const context = this.activeInterviews.get(sessionId);
    if (!context) {
      return null;
    }

    return {
      currentQuestion: context.currentQuestionIndex,
      totalQuestions: 5,
      conversationHistory: context.conversationHistory
    };
  }

  /**
   * End interview session
   */
  endInterview(sessionId) {
    this.activeInterviews.delete(sessionId);
  }
}

module.exports = new GeminiVoiceInterviewService();
