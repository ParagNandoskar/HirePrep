const express = require('express');
const {
  getLeaderboard,
  generateLeaderboard,
  getCandidatePosition,
  updateCandidateStatus,
  getLeaderboardStats,
  getTopPerformers,
  compareCandidates,
  getGlobalLeaderboard
} = require('../controllers/leaderboardController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Global leaderboard (for students)
router.get('/students', getGlobalLeaderboard);

// Leaderboard viewing routes
router.get('/:jobId', getLeaderboard); // Accessible by company or students (for their own position)
router.get('/:jobId/stats', getLeaderboardStats);
router.get('/:jobId/candidate/:studentId/position', getCandidatePosition);

// Company-only routes
router.post('/:jobId/generate', authorize('company'), generateLeaderboard);
router.put('/:jobId/candidate/:studentId/status', authorize('company'), updateCandidateStatus);
router.post('/:jobId/compare-candidates', authorize('company'), compareCandidates);

// Global analytics routes
router.get('/analytics/top-performers', getTopPerformers);

module.exports = router;
