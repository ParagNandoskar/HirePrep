const express = require('express');
const {
  createJob,
  getJobs,
  getJobById,
  getRecommendedJobs,
  applyToJob,
  updateJob,
  deleteJob,
  getCompanyJobs,
  updateApplicationStatus
} = require('../controllers/jobController');
const { authenticate, authorize, optionalAuth } = require('../middlewares/authMiddleware');
const { validate, jobValidation } = require('../middlewares/validation');

const router = express.Router();

// Public routes (with optional authentication for personalization)
router.get('/', optionalAuth, getJobs);
router.get('/:jobId', optionalAuth, getJobById);

// Protected routes
router.use(authenticate);

// Job management routes (company only)
router.post('/', authorize('company'), validate(jobValidation), createJob);
router.put('/:jobId', authorize('company'), updateJob);
router.delete('/:jobId', authorize('company'), deleteJob);
router.get('/company/my-jobs', authorize('company'), getCompanyJobs);

// Application management (company only)
router.put('/:jobId/applications/:studentId/status', authorize('company'), updateApplicationStatus);

// Student routes
router.get('/match/:studentId', getRecommendedJobs); // Can be accessed by student or company
router.post('/:jobId/apply', authorize('student'), applyToJob);

module.exports = router;
