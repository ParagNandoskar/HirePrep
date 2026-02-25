const geminiVoiceService = require('../services/geminiVoiceService');
const behavioralAnalysisService = require('../services/behavioralAnalysisService');
const videoUploadService = require('../services/videoUploadService');
const Application = require('../models/Application');
const interviewAggregationService = require('../services/interviewAggregationService');

/**
 * Initialize a new AI voice interview
 */
exports.initializeVoiceInterview = async (req, res) => {
  try {
    const { jobId, applicationId, candidateName } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const result = await geminiVoiceService.initializeInterview(jobId, candidateName || 'Candidate');

    res.json(result);
  } catch (error) {
    console.error('Error initializing voice interview:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get next AI-generated question
 */
exports.getNextQuestion = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await geminiVoiceService.generateNextQuestion(sessionId);

    res.json(result);
  } catch (error) {
    console.error('Error getting next question:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get audio for a question (streaming or download)
 */
exports.getQuestionAudio = async (req, res) => {
  try {
    const { questionText, voiceType } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'Question text is required' });
    }

    const audioBuffer = await geminiVoiceService.generateQuestionAudio(
      questionText,
      voiceType || 'professional_female'
    );

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Accept-Ranges': 'bytes'
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Submit candidate's voice answer with behavioral analysis
 */
exports.submitAnswer = async (req, res) => {
  try {
    const {
      sessionId,
      answerText,
      questionText,
      videoFrames,
      audioChunks,
      videoBlob,
      candidateId,
      questionNumber
    } = req.body;

    if (!sessionId || !answerText) {
      return res.status(400).json({ error: 'Session ID and answer text are required' });
    }

    let videoAnalysis = null;
    let audioAnalysis = null;
    let behavioralData = null;

    // Run video + audio analysis in parallel if data was provided
    if ((videoFrames && videoFrames.length > 0) || (audioChunks && audioChunks.length > 0)) {
      console.log(`🔬 Running parallel behavioral analysis: ${videoFrames?.length || 0} frames, ${audioChunks?.length || 0} audio chunks`);

      const [videoResult, audioResult] = await Promise.allSettled([
        videoFrames?.length > 0
          ? behavioralAnalysisService.analyzeVideo(videoFrames, sessionId)
          : Promise.resolve(null),
        audioChunks?.length > 0
          ? behavioralAnalysisService.analyzeAudioChunks(audioChunks, sessionId, answerText)
          : Promise.resolve(null)
      ]);

      videoAnalysis = videoResult.status === 'fulfilled' ? videoResult.value : null;
      audioAnalysis = audioResult.status === 'fulfilled' ? audioResult.value : null;

      if (videoResult.status === 'rejected') console.warn('⚠️ Video analysis failed:', videoResult.reason?.message);
      if (audioResult.status === 'rejected') console.warn('⚠️ Audio analysis failed:', audioResult.reason?.message);
    }

    // Combine behavioral scores
    try {
      if (videoAnalysis || audioAnalysis) {
        behavioralData = behavioralAnalysisService.combineBehavioralAnalysis(
          videoAnalysis || behavioralAnalysisService._getDefaultVideoAnalysis(),
          audioAnalysis || behavioralAnalysisService._getDefaultAudioAnalysis()
        );

        console.log('✅ Behavioral analysis complete:', {
          videoScore: behavioralData.videoScore,
          audioScore: behavioralData.audioScore,
          overallBehavioral: behavioralData.overallBehavioralScore
        });
      }
    } catch (error) {
      console.warn('⚠️ Behavioral analysis combine failed, using defaults:', error.message);
    }

    // Persist per-question analysis to MongoDB (used for final score aggregation)
    const candidateIdFromAuth = req.user?._id || req.user?.id || candidateId || null;
    await interviewAggregationService.saveQuestionAnalysis(
      sessionId,
      questionNumber || 0,
      questionText || '',
      answerText,
      videoAnalysis,
      audioAnalysis,
      candidateIdFromAuth
    );

    // Optional: Upload video to S3 for record keeping
    if (videoBlob && candidateIdFromAuth && questionNumber) {
      try {
        const videoBuffer = Buffer.from(videoBlob, 'base64');
        await videoUploadService.uploadVideo(videoBuffer, candidateIdFromAuth, sessionId, questionNumber);
        console.log('✅ Video uploaded to S3');
      } catch (error) {
        console.warn('⚠️ Video upload failed:', error.message);
      }
    }

    // Process answer in Gemini session context
    // If the in-memory session is gone (e.g. backend restart), we still return success
    // so the interview can continue — behavioral data is already persisted to MongoDB
    let result = { success: true, message: 'Answer recorded' };
    try {
      result = await geminiVoiceService.processAnswer(sessionId, answerText, behavioralData);
    } catch (sessionErr) {
      console.warn('⚠️ Gemini session not found in memory (may have restarted):', sessionErr.message);
      // Non-fatal — behavioral data is saved to MongoDB; interview can continue
    }

    res.json({
      ...result,
      videoScore:  videoAnalysis?.videoScore || 0,
      audioScore:  audioAnalysis?.audioScore || 0,
      behavioralData: behavioralData || null
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Complete interview and get comprehensive analysis
 */
exports.completeInterview = async (req, res) => {
  try {
    const { sessionId, applicationId } = req.body;

    console.log('🎯 Complete Interview Request:', { sessionId, applicationId });

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Generate final analysis with combined scores
    console.log('📊 Generating final analysis...');
    const analysis = await geminiVoiceService.generateFinalAnalysis(sessionId);
    console.log('✅ Analysis generated:', {
      overallScore: analysis.overallScore,
      hasStrengths: !!analysis.strengths,
      hasImprovements: !!analysis.improvements
    });

    // Update application with comprehensive interview results
    if (applicationId) {
      console.log(`💾 Updating application ${applicationId}...`);

      // Build transcript — prefer in-memory session; fall back to MongoDB QuestionAnalysis
      const context = geminiVoiceService.getInterviewProgress(sessionId);
      let transcript = [];
      let questionsAnswered = 0;

      if (context && context.conversationHistory && context.conversationHistory.length > 0) {
        let questionNumber = 0;
        context.conversationHistory.forEach(item => {
          if (item.type === 'ai_question') {
            questionNumber++;
            transcript.push({ type: 'question', content: item.content, timestamp: item.timestamp, questionNumber });
          } else if (item.type === 'candidate_answer') {
            transcript.push({ type: 'answer', content: item.content, timestamp: item.timestamp, questionNumber });
          }
        });
        questionsAnswered = context.conversationHistory.filter(h => h.type === 'candidate_answer').length;
      } else {
        // Session was lost (e.g. nodemon restart) — rebuild from MongoDB
        console.warn('⚠️ Session not in memory — building transcript from QuestionAnalysis docs');
        const QuestionAnalysis = require('../models/QuestionAnalysis');
        const qaDocs = await QuestionAnalysis.find({ sessionId }).sort({ questionNumber: 1 }).lean();
        qaDocs.forEach(q => {
          if (q.questionText) transcript.push({ type: 'question', content: q.questionText, questionNumber: q.questionNumber });
          if (q.answerText)   transcript.push({ type: 'answer',   content: q.answerText,   questionNumber: q.questionNumber });
        });
        questionsAnswered = qaDocs.length;
      }

      console.log(`📝 Saving interview transcript with ${transcript.length} entries (${questionsAnswered} Q&A pairs)`);

      const updatedApp = await Application.findByIdAndUpdate(applicationId, {
        interviewCompleted: true,  // Mark interview as completed
        status: 'interviewed',     // Update status to show they have been interviewed
        interviewStatus: 'completed',
        screeningScore: analysis.overallScore,  // MUST save screeningScore
        interviewScore: analysis.overallScore,  // Save the interview score
        questionsAnswered: questionsAnswered,   // Track number of questions answered
        interviewTranscript: transcript,        // Save full Q&A transcript
        aiAnalysis: {
          scores: {
            overall: analysis.overallScore,
            content: analysis.contentScore,
            behavioral: analysis.behavioralScore,
            video: analysis.videoScore,
            audio: analysis.audioScore,
            communication: analysis.communicationScore,
            technical: analysis.technicalScore,
            problemSolving: analysis.problemSolvingScore,
            culturalFit: analysis.culturalFitScore
          },
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          insights: analysis.insights,
          behavioralInsights: analysis.behavioralInsights,
          recommendation: analysis.recommendation,
          integrityWarning: analysis.integrityWarning,
          questionsAnswered: questionsAnswered
        },
        interviewCompletedAt: new Date()
      }, { new: true });

      if (updatedApp) {
        console.log(`✅ Application ${applicationId} updated successfully`);
        console.log(`   - interviewCompleted: ${updatedApp.interviewCompleted}`);
        console.log(`   - status: ${updatedApp.status}`);
        console.log(`   - screeningScore: ${updatedApp.screeningScore}`);

        // Generate detailed AI feedback asynchronously (don't wait for it)
        const detailedFeedbackService = require('../services/detailedFeedbackService');
        detailedFeedbackService.generateDetailedFeedback(applicationId)
          .then(() => console.log(`✅ Detailed feedback generated for ${applicationId}`))
          .catch(err => console.error(`❌ Error generating detailed feedback:`, err));
      } else {
        console.error(`❌ Application ${applicationId} NOT FOUND in database!`);
      }
    } else {
      console.log('⚠️  No applicationId provided - skipping application update');
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get interview progress
 */
exports.getProgress = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const progress = geminiVoiceService.getInterviewProgress(sessionId);

    if (!progress) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    res.json(progress);
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Health check for Python microservices
 */
exports.checkBehavioralServices = async (req, res) => {
  try {
    const health = await behavioralAnalysisService.healthCheck();

    const status = health.video && health.audio ? 'healthy' : 'degraded';
    const statusCode = status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      status,
      services: {
        video: health.video ? 'operational' : 'unavailable',
        audio: health.audio ? 'operational' : 'unavailable'
      },
      timestamp: health.timestamp,
      message: status === 'healthy'
        ? 'All behavioral analysis services are operational'
        : 'Some behavioral analysis services are unavailable. Interviews will use default scoring.'
    });
  } catch (error) {
    console.error('Error checking behavioral services:', error);
    res.status(500).json({ error: error.message });
  }
};
