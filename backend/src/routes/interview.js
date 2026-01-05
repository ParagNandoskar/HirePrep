const express = require('express');
const {
  startInterview,
  getInterview,
  submitAnswer,
  analyzeVideo,
  analyzeAudio,
  finishInterview,
  getInterviewHistory,
  cancelInterview,
  generateAIQuestions,
  submitScreeningInterview,
  getJobLeaderboard
} = require('../controllers/interviewController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { validate, interviewStartValidation, interviewAnalysisValidation } = require('../middlewares/validation');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Interview management routes
router.post('/start', authorize('student'), validate(interviewStartValidation), startInterview);
router.get('/:interviewId', getInterview); // Accessible by student or company
router.post('/:interviewId/cancel', authorize('student'), cancelInterview);
router.post('/:interviewId/finish', authorize('student'), finishInterview);

// Real-time interview interaction routes
router.post('/:interviewId/submit-answer', authorize('student'), submitAnswer);
router.post('/:interviewId/analyze-video', authorize('student'), analyzeVideo);
router.post('/:interviewId/analyze-audio', authorize('student'), analyzeAudio);

// History and reporting routes
router.get('/history/my-interviews', authorize('student'), getInterviewHistory);

// Screening interview routes
router.post('/screening/generate-questions', generateAIQuestions);
router.post('/screening/:applicationId/submit', authorize('student'), submitScreeningInterview);
router.get('/screening/leaderboard/:jobId', getJobLeaderboard);

module.exports = router;
