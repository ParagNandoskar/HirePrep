const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { uploadProfileImageToS3 } = require('../config/aws');

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
router.post('/upload-avatar', uploadProfileImageToS3.single('profileImage'), candidateController.uploadAvatar);

module.exports = router;