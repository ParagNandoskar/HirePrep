const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

// Public routes (no authentication required)
router.get('/', jobController.getAllJobs);

// Protected routes
router.use(authenticate);

// Job application routes
router.post('/:id/apply', jobController.applyToJob);
router.get('/:id/applications', authorize('company'), jobController.getJobApplications);

// Job search and matching (candidate routes)
router.get('/matched', authorize('candidate'), jobController.getMatchedJobs);
router.get('/enhanced-matched', authorize('candidate'), jobController.getEnhancedMatchedJobs);
router.get('/recommendations', authorize('candidate'), jobController.getRecommendedJobs);

// Company specific routes
router.get('/company/my-jobs', authorize('company'), jobController.getCompanyJobs);

// Job CRUD (Company only)
router.post('/', authorize('company'), jobController.createJob);
router.put('/:id', authorize('company'), jobController.updateJob);
router.delete('/:id', authorize('company'), jobController.deleteJob);
router.get('/:id/stats', authorize('company'), jobController.getJobStats);
router.put('/:id/toggle-status', authorize('company'), jobController.toggleJobStatus);

// Public route for getting job by ID (must be last)
router.get('/:id', jobController.getJobById);

module.exports = router;