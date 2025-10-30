const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Protect all routes - require authentication
router.use(authenticate);

// Routes
router.route('/profile')
  .get(companyController.getProfile)
  .put(companyController.updateProfile);

router.post('/upload-logo', companyController.uploadLogo);

// Additional useful routes
router.get('/dashboard-stats', companyController.getDashboardStats);
router.get('/applications/:jobId', companyController.getJobApplications);
router.put('/applications/:applicationId/status', companyController.updateApplicationStatus);

module.exports = router;