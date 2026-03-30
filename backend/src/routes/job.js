const express = require('express');
const {
  createJob,
  getAllJobs,
  getJobById,
  getRecommendedJobs,
  applyToJob,
  updateJob,
  deleteJob,
  getCompanyJobs
} = require('../controllers/jobController');
const { authenticate, authorize, optionalAuth } = require('../middlewares/authMiddleware');
const { validate, jobValidation } = require('../middlewares/validation');

const router = express.Router();

// Public routes (with optional authentication for personalization)
router.get('/', optionalAuth, getAllJobs);
router.get('/:id', optionalAuth, getJobById);

// Protected routes
router.use(authenticate);

// Job management routes (company only)
router.post('/', authorize('company'), validate(jobValidation), createJob);
router.put('/:id', authorize('company'), updateJob);
router.delete('/:id', authorize('company'), deleteJob);
router.get('/company/my-jobs', authorize('company'), getCompanyJobs);

// Student routes
router.get('/match/:studentId', getRecommendedJobs); // Can be accessed by student or company
router.post('/:id/apply', authorize('student'), applyToJob);

module.exports = router;
