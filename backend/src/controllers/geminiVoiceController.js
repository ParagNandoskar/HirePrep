const geminiVoiceService = require('../services/geminiVoiceService');
const behavioralAnalysisService = require('../services/behavioralAnalysisService');
const videoUploadService = require('../services/videoUploadService');
const Application = require('../models/Application');

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
      videoFrames, 
      audioChunks,
      videoBlob,
      candidateId,
      questionNumber
    } = req.body;

    if (!sessionId || !answerText) {
      return res.status(400).json({ error: 'Session ID and answer text are required' });
    }

    let behavioralData = null;

    // Perform behavioral analysis if video/audio provided
    if (videoFrames && videoFrames.length > 0 || audioChunks && audioChunks.length > 0) {
      try {
        console.log('🔍 Running behavioral analysis...');
        
        // Run video and audio analysis in parallel
        const [videoAnalysis, audioAnalysis] = await Promise.all([
          videoFrames && videoFrames.length > 0 
            ? behavioralAnalysisService.analyzeVideo(videoFrames, sessionId)
            : Promise.resolve(null),
          audioChunks && audioChunks.length > 0 
            ? behavioralAnalysisService.analyzeAudio(audioChunks, sessionId)
            : Promise.resolve(null)
        ]);

        // Combine behavioral scores
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
        console.warn('⚠️ Behavioral analysis failed, using defaults:', error.message);
        // Continue without behavioral data
      }
    }

    // Optional: Upload video to S3 for record keeping
    if (videoBlob && candidateId && questionNumber) {
      try {
        const videoBuffer = Buffer.from(videoBlob, 'base64');
        await videoUploadService.uploadVideo(videoBuffer, candidateId, sessionId, questionNumber);
        console.log('✅ Video uploaded to S3');
      } catch (error) {
        console.warn('⚠️ Video upload failed:', error.message);
        // Continue without video upload
      }
    }

    // Process answer with behavioral data
    const result = await geminiVoiceService.processAnswer(sessionId, answerText, behavioralData);

    res.json({
      ...result,
      behavioralData: behavioralData || { message: 'No behavioral analysis performed' }
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

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Generate final analysis with combined scores
    const analysis = await geminiVoiceService.generateFinalAnalysis(sessionId);

    // Update application with comprehensive interview results
    if (applicationId) {
      await Application.findByIdAndUpdate(applicationId, {
        interviewStatus: 'completed',
        screeningScore: analysis.overallScore,
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
          integrityWarning: analysis.integrityWarning
        },
        interviewCompletedAt: new Date()
      });
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
