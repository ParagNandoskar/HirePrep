const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { smartUploadMiddleware } = require('../config/upload');

// Protect all routes - require authentication
router.use(authenticate);

// Routes
router.route('/profile')
  .get(candidateController.getProfile)
  .put(candidateController.updateProfile);

router.route('/applications')
  .get(candidateController.getApplications);

router.route('/applications/:applicationId')
  .put(candidateController.updateApplication);

// Additional useful routes
router.get('/dashboard-stats', candidateController.getDashboardStats);
router.get('/job-recommendations', candidateController.getJobRecommendations);
router.get('/upcoming-interviews', candidateController.getUpcomingInterviews);
router.post('/upload-avatar', smartUploadMiddleware, candidateController.uploadAvatar);

// Test endpoint for S3 configuration (only in development)
if (process.env.NODE_ENV !== 'production') {
  router.get('/test-s3', async (req, res) => {
    try {
      const { checkS3Connection, setS3BucketPolicy } = require('../config/aws');
      
      // Check S3 connection
      const connectionResult = await checkS3Connection();
      
      // Try to set bucket policy for profile images
      const policyResult = await setS3BucketPolicy();
      
      res.json({
        success: true,
        s3Connection: connectionResult,
        bucketPolicy: policyResult,
        message: 'S3 configuration test completed'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'S3 configuration test failed'
      });
    }
  });
}

module.exports = router;