const express = require('express');
const {
  uploadResume,
  getResume,
  getMyResume,
  updateResumeData,
  deleteResume,
  analyzeResumeForJob,
  getResumeAnalytics,
  getResumeSignedUrl
} = require('../controllers/resumeController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { uploadToS3 } = require('../config/aws');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Resume management routes
router.post('/upload', authorize('student'), uploadToS3.single('resume'), uploadResume);
router.get('/my-resume', authorize('student'), getMyResume);
router.get('/:userId', getResume); // Accessible by student (own) or company
router.put('/update-data', authorize('student'), updateResumeData);
router.delete('/delete', authorize('student'), deleteResume);

// Analysis routes
router.get('/analyze/job/:jobId', authorize('student'), analyzeResumeForJob);
router.get('/analytics/my-resume', authorize('student'), getResumeAnalytics);

// Secure file access route
router.get('/:userId/signed-url', getResumeSignedUrl); // Accessible by student (own) or company

module.exports = router;
