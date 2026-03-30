/**
 * Example Route - Resume API with Production-Grade Features
 * Demonstrates:
 * - Redis caching integration
 * - Queue-based background processing
 * - Rate limiting (via middleware in app.js)
 * - Error handling
 */

const express = require('express');
const router = express.Router();

// Assuming auth middleware exists
// const { authenticate } = require('../middlewares/auth');

const exampleController = require('../controllers/exampleController');

/**
 * GET /api/example/resume/:resumeId
 * Get a single resume with caching
 * - First request: Database hit, result cached for 1 hour
 * - Subsequent requests: Cache hit (faster)
 * Cache Key: "resume:{resumeId}"
 */
router.get('/resume/:resumeId', (req, res, next) => {
  // Optionally apply auth: authenticate(req, res, next) then continue
  exampleController.getResume(req, res).catch(next);
});

/**
 * GET /api/example/candidate/:candidateId/resumes
 * Get all resumes for a candidate with caching
 * - Cache TTL: 30 minutes
 * Cache Key: "candidate:{candidateId}:resumes"
 */
router.get('/candidate/:candidateId/resumes', (req, res, next) => {
  exampleController.getCandidateResumes(req, res).catch(next);
});

/**
 * POST /api/example/resume/upload
 * Upload and queue resume for processing
 * - Returns 202 (Accepted) with job ID
 * - Job is stored in Redis queue "resume-processing"
 * - Updates are applied asynchronously
 * - Invalidates candidate cache automatically
 *
 * Body:
 * {
 *   "candidateId": "...",
 *   "fileUrl": "s3://..." // or use multipart form-data with file
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "jobId": "resume-...",
 *   "checkProgressUrl": "/api/example/job/resume-... /progress"
 * }
 */
router.post('/resume/upload', (req, res, next) => {
  exampleController.uploadResume(req, res).catch(next);
});

/**
 * PUT /api/example/resume/:resumeId
 * Update resume and invalidate cache
 * - Automatically clears cached resume data
 * - Clears related candidate cache
 *
 * Body:
 * {
 *   "title": "...",
 *   "skills": [...],
 *   "experience": [...]
 * }
 */
router.put('/resume/:resumeId', (req, res, next) => {
  exampleController.updateResume(req, res).catch(next);
});

/**
 * POST /api/example/resume/:resumeId/analyze
 * Queue resume for AI analysis
 * - Returns 202 (Accepted) with job ID
 * - Job is stored in Redis queue "interview-analysis"
 * - Long-running AI processing happens in background
 * - Uses AI rate limiter (20 calls per 10 minutes)
 *
 * Response:
 * {
 *   "success": true,
 *   "jobId": "interview-...",
 *   "checkProgressUrl": "/api/example/job/interview-.../progress"
 * }
 */
router.post('/resume/:resumeId/analyze', (req, res, next) => {
  exampleController.analyzeResume(req, res).catch(next);
});

/**
 * GET /api/example/job/:jobId/progress
 * Check background job progress
 * - Polls Redis for job status
 * - Returns state, progress percentage, retry count
 * - Available states: waiting, active, completed, failed, delayed
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "resume-...",
 *     "state": "active",
 *     "progress": 65,
 *     "attempts": 0,
 *     "failedReason": null
 *   }
 * }
 */
router.get('/job/:jobId/progress', (req, res, next) => {
  exampleController.checkJobProgress(req, res).catch(next);
});

/**
 * GET /api/example/queue/stats
 * Get queue statistics
 * - Shows counts of jobs in each state
 *
 * Query Params:
 * - queueName: "resume-processing" (default), "interview-analysis", "job-recommendations", "email-notifications"
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "queue": "resume-processing",
 *     "active": 2,
 *     "completed": 145,
 *     "failed": 3,
 *     "delayed": 0,
 *     "waiting": 5,
 *     "paused": 0
 *   }
 * }
 */
router.get('/queue/stats', (req, res, next) => {
  exampleController.getQueueInfo(req, res).catch(next);
});

/**
 * GET /api/example/cache/stats
 * Get Redis cache statistics
 * - Shows memory usage, total keys, connection status
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "connected": true,
 *     "memoryUsage": "2.5M",
 *     "keysCount": 342
 *   }
 * }
 */
router.get('/cache/stats', (req, res, next) => {
  exampleController.getCacheStats(req, res).catch(next);
});

module.exports = router;
