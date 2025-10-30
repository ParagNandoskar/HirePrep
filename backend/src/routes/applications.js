const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Protect all routes - require authentication
router.use(authenticate);

// Candidate routes
router.route('/')
  .get(applicationController.getApplications)
  .post(applicationController.applyToJob);

router.route('/:id')
  .get(applicationController.getApplicationById)
  .put(applicationController.updateApplication)
  .delete(applicationController.deleteApplication);

router.get('/stats', applicationController.getApplicationStats);

// Company routes  
router.get('/company/all', authorize('company'), applicationController.getCompanyApplications);
router.put('/company/:id/status', authorize('company'), applicationController.updateApplicationStatus);

module.exports = router;