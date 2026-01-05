const { getGeminiFlash } = require('../config/gemini');
const Job = require('../models/Job');
const googleTTSService = require('./googleTTSService');

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
      const context = this.activeInterviews.get(sessionId);
      if (!context) {
        throw new Error('Invalid session ID');
      }

      const model = getGeminiFlash();
      
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
        throw new Error('Invalid session ID');
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
   */
  async generateFinalAnalysis(sessionId) {
    try {
      const context = this.activeInterviews.get(sessionId);
      if (!context) {
        throw new Error('Invalid session ID');
      }

      const model = getGeminiFlash();

      // Calculate average behavioral scores from all answers
      const behavioralScores = context.conversationHistory
        .filter(item => item.type === 'candidate_answer' && item.behavioralAnalysis)
        .map(item => item.behavioralAnalysis);

      let avgBehavioralScore = 65; // Default
      let avgVideoScore = 65;
      let avgAudioScore = 65;
      let hasCheatingIndicators = false;

      if (behavioralScores.length > 0) {
        avgBehavioralScore = behavioralScores.reduce((sum, b) => sum + b.overallBehavioralScore, 0) / behavioralScores.length;
        avgVideoScore = behavioralScores.reduce((sum, b) => sum + b.videoScore, 0) / behavioralScores.length;
        avgAudioScore = behavioralScores.reduce((sum, b) => sum + b.audioScore, 0) / behavioralScores.length;
        
        // Check for cheating indicators
        hasCheatingIndicators = behavioralScores.some(b => 
          b.cheatingIndicators?.multiplePersons || 
          b.cheatingIndicators?.frequentLookAway ||
          b.cheatingIndicators?.noFaceDetected
        );
      }

      const analysisPrompt = `You are an expert hiring manager analyzing an interview for the position of ${context.jobTitle}.

Job Requirements: ${Array.isArray(context.requirements) ? context.requirements.join(', ') : context.requirements}

Interview Transcript:
${context.conversationHistory.map(item => {
  if (item.type === 'ai_question') return `Interviewer: ${item.content}`;
  if (item.type === 'candidate_answer') return `Candidate: ${item.content}`;
  return '';
}).join('\n')}

Provide a detailed analysis with:
1. Overall Content Score (0-100) - Based ONLY on answer quality, technical knowledge, problem solving
2. Communication Skills Score (0-100)
3. Technical Knowledge Score (0-100)
4. Problem Solving Score (0-100)
5. Cultural Fit Score (0-100)
6. Strengths (bullet points)
7. Areas for Improvement (bullet points)
8. Key Insights
9. Overall Recommendation (Highly Recommended / Recommended / Consider / Not Recommended)

Format your response as JSON with these exact keys: contentScore, communicationScore, technicalScore, problemSolvingScore, culturalFitScore, strengths (array), improvements (array), insights (string), recommendation (string)`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      let analysisText = response.text();

      // Clean up the response to extract JSON
      analysisText = analysisText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      let analysis;
      try {
        analysis = JSON.parse(analysisText);
      } catch (parseError) {
        // If JSON parsing fails, create a structured response
        console.error('Failed to parse analysis JSON:', parseError);
        analysis = {
          contentScore: 75,
          communicationScore: 75,
          technicalScore: 70,
          problemSolvingScore: 75,
          culturalFitScore: 80,
          strengths: ['Participated in the interview', 'Provided responses to questions'],
          improvements: ['Could provide more detailed answers', 'Could demonstrate more technical knowledge'],
          insights: 'The candidate completed the interview and provided responses to the questions asked.',
          recommendation: 'Consider'
        };
      }

      // COMBINE SCORES: 60% Content + 40% Behavioral
      const contentScore = analysis.contentScore || 75;
      const finalScore = Math.round((contentScore * 0.6) + (avgBehavioralScore * 0.4));

      // Add behavioral data to analysis
      analysis.overallScore = finalScore;
      analysis.contentScore = Math.round(contentScore);
      analysis.behavioralScore = Math.round(avgBehavioralScore);
      analysis.videoScore = Math.round(avgVideoScore);
      analysis.audioScore = Math.round(avgAudioScore);
      
      // Add behavioral insights
      if (behavioralScores.length > 0) {
        analysis.behavioralInsights = {
          eyeContact: avgVideoScore > 70 ? 'Good' : avgVideoScore > 50 ? 'Moderate' : 'Needs Improvement',
          confidence: avgAudioScore > 70 ? 'Confident' : avgAudioScore > 50 ? 'Moderate' : 'Nervous',
          engagement: avgBehavioralScore > 70 ? 'Highly Engaged' : avgBehavioralScore > 50 ? 'Engaged' : 'Low Engagement'
        };

        if (hasCheatingIndicators) {
          analysis.integrityWarning = '⚠️ Potential integrity concerns detected during the interview';
          analysis.recommendation = 'Requires Further Review';
        }
      }

      // Clean up the session
      this.activeInterviews.delete(sessionId);

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
