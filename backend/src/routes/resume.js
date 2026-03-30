const express = require('express');
const {
  uploadResume,
  getResume,
  getMyResume,
  getResumes,
  syncSkillsToProfile,
  updateResumeData,
  deleteResume,
  analyzeResumeForJob,
  getResumeAnalytics,
  getResumeSignedUrl,
  viewResume,
  downloadResume,
  reprocessResume
} = require('../controllers/resumeController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { uploadToS3 } = require('../config/aws');
const { getJobStatus, getQueueStats } = require('../services/queue');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// TEST ENDPOINT - Remove after debugging
router.get('/test', (req, res) => {
  console.log('Resume test endpoint called by user:', req.user.id);
  res.json({
    success: true,
    message: 'Resume API working',
    userId: req.user.id,
    userRole: req.user.role
  });
});

// Background job status endpoints
router.get('/job-status/:jobId', async (req, res) => {
  try {
    const status = await getJobStatus(req.params.jobId, 'resume-processing');
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    return res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Error getting job status:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get job status'
    });
  }
});

router.get('/queue-stats/:queueName', async (req, res) => {
  try {
    const stats = await getQueueStats(req.params.queueName);
    if (Object.keys(stats).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Queue not found'
      });
    }
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error getting queue stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue stats'
    });
  }
});

// Resume management routes that frontend expects
router.get('/', authorize('student'), getResumes); // Frontend expects: GET /api/resumes
router.post('/upload', authorize('student'), uploadToS3.single('resume'), uploadResume);
router.post('/sync-skills', authorize('student'), syncSkillsToProfile); // NEW: Sync skills to profile
router.get('/my-resume', authorize('student'), getMyResume);
router.get('/view/:id', viewResume); // Frontend expects: GET /api/resumes/view/{id}
router.get('/download/:candidateId', downloadResume); // Frontend expects: GET /api/resumes/download/{candidateId}
router.post('/reprocess/:candidateId', reprocessResume); // Frontend expects: POST /api/resumes/reprocess/{candidateId}
router.delete('/:id', authorize('student'), deleteResume); // Frontend expects: DELETE /api/resumes/{id}

// Existing routes (maintaining backward compatibility)
router.get('/:userId', authenticate, getResume); // Accessible by student (own) or company
router.put('/update-data', authorize('student'), updateResumeData);
router.delete('/delete', authorize('student'), deleteResume);

// Analysis routes
router.get('/analyze/job/:jobId', authorize('student'), analyzeResumeForJob);
router.get('/analytics/my-resume', authorize('student'), getResumeAnalytics);

// Secure file access route
router.get('/:userId/signed-url', authenticate, getResumeSignedUrl); // Accessible by student (own) or company

module.exports = router;
