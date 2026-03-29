const express = require('express');
const router = express.Router();
const analysisService = require('../services/analysisService');
const Interview = require('../models/Interview');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const { successResponse, errorResponse } = require('../utils/helpers');

/**
 * @route   POST /api/analysis/video-frame
 * @desc    Analyze a single video frame
 * @access  Protected (Student)
 */
router.post('/video-frame', authenticate, authorize('student'), asyncHandler(async (req, res) => {
  const { interviewId, questionId, frameBase64 } = req.body;
  const candidateId = req.user.id;

  if (!interviewId || questionId === undefined || !frameBase64) {
    return errorResponse(res, 'Missing required fields: interviewId, questionId, frameBase64', 400);
  }

  // Verify interview belongs to user
  const interview = await Interview.findOne({ _id: interviewId, studentId: candidateId });
  if (!interview) {
    return errorResponse(res, 'Interview not found or unauthorized', 404);
  }

  const result = await analysisService.analyzeVideoFrame(
    frameBase64,
    interviewId,
    candidateId,
    questionId
  );

  if (result.success) {
    return successResponse(res, result.data, 'Video frame analyzed successfully');
  } else {
    return errorResponse(res, result.error || 'Video analysis failed', 500);
  }
}));

/**
 * @route   POST /api/analysis/audio
 * @desc    Analyze audio recording
 * @access  Protected (Student)
 */
router.post('/audio', authenticate, authorize('student'), asyncHandler(async (req, res) => {
  const { audioBase64, transcript } = req.body;

  if (!audioBase64) {
    return errorResponse(res, 'Missing required field: audioBase64', 400);
  }

  const result = await analysisService.analyzeAudio(audioBase64, transcript);

  if (result.success) {
    return successResponse(res, result.data, 'Audio analyzed successfully');
  } else {
    return errorResponse(res, result.error || 'Audio analysis failed', 500);
  }
}));

/**
 * @route   POST /api/analysis/interview-answer
 * @desc    Process complete interview answer (video + audio + transcript)
 * @access  Protected (Student)
 */
router.post('/interview-answer', authenticate, authorize('student'), asyncHandler(async (req, res) => {
  const {
    interviewId,
    questionId,
    videoBase64,
    audioBase64,
    transcript,
    question,
    answer
  } = req.body;
  
  const candidateId = req.user.id;

  // Verify interview
  const interview = await Interview.findOne({ _id: interviewId, studentId: candidateId });
  if (!interview) {
    return errorResponse(res, 'Interview not found or unauthorized', 404);
  }

  if (interview.status !== 'in-progress') {
    return errorResponse(res, 'Interview is not in progress', 400);
  }

  // Process video and audio analysis
  const analysisResult = await analysisService.processInterviewAnswer({
    interviewId,
    candidateId,
    questionId,
    videoBase64,
    audioBase64,
    transcript
  });

  if (!analysisResult.success) {
    return errorResponse(res, analysisResult.error || 'Analysis failed', 500);
  }

  // Update interview conversation with analysis results
  try {
    // Find the question in conversation
    const questionIndex = interview.conversation.findIndex(
      item => item.questionId === questionId
    );

    if (questionIndex === -1) {
      return errorResponse(res, 'Question not found in interview', 404);
    }

    // Add or update answer entry
    const answerEntry = {
      type: 'answer',
      content: answer || transcript,
      question: question,
      questionId: questionId,
      timestamp: new Date(),
      answerTranscript: transcript,
      
      // Analysis results
      videoAnalysis: analysisResult.data.videoAnalysis,
      audioAnalysis: analysisResult.data.audioAnalysis,
      combinedScore: analysisResult.data.combinedScore,
      
      // Mark as analyzed
      analysisStatus: {
        transcribed: Boolean(transcript),
        videoAnalyzed: Boolean(videoBase64),
        audioAnalyzed: Boolean(audioBase64),
        videoDeleted: false
      }
    };

    // Add answer after the question
    interview.conversation.splice(questionIndex + 1, 0, answerEntry);
    
    await interview.save();

    return successResponse(res, {
      interviewId: interview._id,
      questionId,
      analysisResult: analysisResult.data,
      combinedScore: analysisResult.data.combinedScore
    }, 'Interview answer processed successfully');

  } catch (error) {
    console.error('Error saving analysis to interview:', error);
    return errorResponse(res, 'Failed to save analysis', 500);
  }
}));

/**
 * @route   POST /api/analysis/finalize-interview/:interviewId
 * @desc    Finalize interview and update leaderboard
 * @access  Protected (Student)
 */
router.post('/finalize-interview/:interviewId', authenticate, authorize('student'), asyncHandler(async (req, res) => {
  const { interviewId } = req.params;
  const candidateId = req.user.id;

  // Verify interview belongs to user
  const interview = await Interview.findOne({ _id: interviewId, studentId: candidateId });
  if (!interview) {
    return errorResponse(res, 'Interview not found or unauthorized', 404);
  }

  const result = await analysisService.finalizeInterview(interviewId);

  if (result.success) {
    return successResponse(res, result.data, 'Interview finalized successfully');
  } else {
    return errorResponse(res, result.error || 'Failed to finalize interview', 500);
  }
}));

/**
 * @route   GET /api/analysis/leaderboard/:jobId
 * @desc    Get leaderboard for a job
 * @access  Protected
 */
router.get('/leaderboard/:jobId', authenticate, asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const result = await analysisService.getJobLeaderboard(jobId);

  if (result.success) {
    return successResponse(res, result.data, 'Leaderboard retrieved successfully');
  } else {
    // Return empty leaderboard instead of 404 error
    return successResponse(res, {
      jobId,
      candidates: [],
      totalCandidates: 0,
      averageScore: 0,
      message: result.message || 'No leaderboard data available yet'
    }, result.message || 'No leaderboard data available yet');
  }
}));

/**
 * @route   GET /api/analysis/my-rank/:jobId
 * @desc    Get candidate's rank in a job
 * @access  Protected (Student)
 */
router.get('/my-rank/:jobId', authenticate, authorize('student'), asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const studentId = req.user.id;

  const result = await analysisService.getCandidateRank(jobId, studentId);

  if (result.success) {
    return successResponse(res, result.data, 'Rank retrieved successfully');
  } else {
    return errorResponse(res, result.message || 'Failed to get rank', 404);
  }
}));

/**
 * @route   GET /api/analysis/health
 * @desc    Check if analysis services are running
 * @access  Public
 */
router.get('/health', asyncHandler(async (req, res) => {
  const axios = require('axios');
  const {
    VIDEO_SERVICE_URL,
    AUDIO_SERVICE_URL,
    MICROSERVICE_TIMEOUT_MS
  } = require('../config/services');
  
  const checks = {
    videoService: false,
    audioService: false,
    timestamp: new Date()
  };

  // Check video service
  try {
    await axios.get(`${VIDEO_SERVICE_URL}/health`, { timeout: MICROSERVICE_TIMEOUT_MS });
    checks.videoService = true;
  } catch (error) {
    console.log('Video service not available:', error.message);
  }

  // Check audio service
  try {
    await axios.get(`${AUDIO_SERVICE_URL}/health`, { timeout: MICROSERVICE_TIMEOUT_MS });
    checks.audioService = true;
  } catch (error) {
    console.log('Audio service not available:', error.message);
  }

  return res.json({
    status: checks.videoService && checks.audioService ? 'healthy' : 'degraded',
    services: checks
  });
}));

module.exports = router;
