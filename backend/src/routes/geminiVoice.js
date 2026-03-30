const express = require('express');
const router = express.Router();
const geminiVoiceController = require('../controllers/geminiVoiceController');
const { authenticate } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Initialize new voice interview
router.post('/initialize', geminiVoiceController.initializeVoiceInterview);

// Get next AI question
router.post('/next-question', geminiVoiceController.getNextQuestion);

// Get audio for question
router.post('/question-audio', geminiVoiceController.getQuestionAudio);

// Submit answer
router.post('/submit-answer', geminiVoiceController.submitAnswer);

// Complete interview and get analysis
router.post('/complete', geminiVoiceController.completeInterview);

// Candidate mock interview analytics
router.get('/mock-results', geminiVoiceController.getMockResults);
router.get('/mock-results/:mockInterviewId', geminiVoiceController.getMockResultById);

// Get interview progress
router.get('/progress/:sessionId', geminiVoiceController.getProgress);

// Health check for behavioral analysis services
router.get('/behavioral-health', geminiVoiceController.checkBehavioralServices);

module.exports = router;
