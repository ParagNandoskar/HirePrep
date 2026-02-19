const leaderboardService = require('../services/leaderboard');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Get leaderboard for a specific job
const getLeaderboard = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { page = 1, limit = 100 } = req.query; // Show all candidates by default

  try {
    const leaderboard = await leaderboardService.getLeaderboardWithDetails(
      jobId,
      parseInt(page),
      parseInt(limit)
    );

    return successResponse(res, leaderboard, 'Leaderboard retrieved successfully');

  } catch (error) {
    console.error('Leaderboard retrieval error:', error);
    return errorResponse(res, 'Failed to retrieve leaderboard: ' + error.message, 500);
  }
});

// Generate or update leaderboard for a job
const generateLeaderboard = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  // Only companies can generate leaderboards for their jobs
  if (req.user.role !== 'company') {
    return errorResponse(res, 'Access denied. Only companies can generate leaderboards.', 403);
  }

  try {
    // Verify job belongs to the company
    const Job = require('../models/Job');
    const job = await Job.findOne({ _id: jobId, companyId: req.user.id });

    if (!job) {
      return errorResponse(res, 'Job not found or access denied', 404);
    }

    const leaderboard = await leaderboardService.generateLeaderboard(jobId);

    return successResponse(res, leaderboard, 'Leaderboard generated successfully');

  } catch (error) {
    console.error('Leaderboard generation error:', error);
    return errorResponse(res, 'Failed to generate leaderboard: ' + error.message, 500);
  }
});

// Get candidate's position in leaderboard
const getCandidatePosition = asyncHandler(async (req, res) => {
  const { jobId, studentId } = req.params;

  // Check access permissions
  const canAccess = 
    req.user.id === studentId || 
    req.user.role === 'company';

  if (!canAccess) {
    return errorResponse(res, 'Access denied', 403);
  }

  try {
    const position = await leaderboardService.getCandidatePosition(jobId, studentId);

    return successResponse(res, {
      jobId,
      studentId,
      position
    }, 'Candidate position retrieved successfully');

  } catch (error) {
    console.error('Candidate position error:', error);
    return errorResponse(res, 'Failed to get candidate position: ' + error.message, 500);
  }
});

// Update candidate status in leaderboard (company only)
const updateCandidateStatus = asyncHandler(async (req, res) => {
  const { jobId, studentId } = req.params;
  const { status } = req.body;

  if (req.user.role !== 'company') {
    return errorResponse(res, 'Access denied. Only companies can update candidate status.', 403);
  }

  const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'];
  if (!validStatuses.includes(status)) {
    return errorResponse(res, `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`, 400);
  }

  try {
    // Verify job belongs to the company
    const Job = require('../models/Job');
    const job = await Job.findOne({ _id: jobId, companyId: req.user.id });

    if (!job) {
      return errorResponse(res, 'Job not found or access denied', 404);
    }

    const updatedCandidate = await leaderboardService.updateCandidateStatus(
      jobId,
      studentId,
      status
    );

    return successResponse(res, {
      jobId,
      studentId,
      newStatus: status,
      updatedCandidate
    }, 'Candidate status updated successfully');

  } catch (error) {
    console.error('Status update error:', error);
    return errorResponse(res, 'Failed to update candidate status: ' + error.message, 500);
  }
});

// Get leaderboard statistics
const getLeaderboardStats = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  try {
    const Leaderboard = require('../models/Leaderboard');
    const leaderboard = await Leaderboard.findOne({ jobId });

    if (!leaderboard) {
      return errorResponse(res, 'Leaderboard not found', 404);
    }

    // Calculate statistics
    const stats = {
      totalCandidates: leaderboard.totalCandidates,
      averageScore: leaderboard.averageScore,
      lastUpdated: leaderboard.lastUpdated,
      statusDistribution: {
        pending: 0,
        reviewed: 0,
        shortlisted: 0,
        rejected: 0,
        hired: 0
      },
      scoreDistribution: {
        '90-100': 0,
        '80-89': 0,
        '70-79': 0,
        '60-69': 0,
        'below-60': 0
      },
      topPercentile: leaderboard.topPercentile.length
    };

    // Calculate status distribution
    leaderboard.candidates.forEach(candidate => {
      if (stats.statusDistribution[candidate.status] !== undefined) {
        stats.statusDistribution[candidate.status]++;
      }

      // Calculate score distribution
      const score = candidate.scores.overallScore;
      if (score >= 90) stats.scoreDistribution['90-100']++;
      else if (score >= 80) stats.scoreDistribution['80-89']++;
      else if (score >= 70) stats.scoreDistribution['70-79']++;
      else if (score >= 60) stats.scoreDistribution['60-69']++;
      else stats.scoreDistribution['below-60']++;
    });

    return successResponse(res, stats, 'Leaderboard statistics retrieved successfully');

  } catch (error) {
    console.error('Leaderboard stats error:', error);
    return errorResponse(res, 'Failed to retrieve leaderboard statistics', 500);
  }
});

// Get top performers across all jobs (for dashboard)
const getTopPerformers = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  try {
    const Leaderboard = require('../models/Leaderboard');
    
    // Aggregate top performers from all leaderboards
    const topPerformers = await Leaderboard.aggregate([
      { $unwind: '$topPercentile' },
      {
        $lookup: {
          from: 'users',
          localField: 'topPercentile.studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$student' },
      { $unwind: '$job' },
      {
        $project: {
          _id: 0,
          studentId: '$topPercentile.studentId',
          student: {
            name: '$student.name',
            email: '$student.email',
            profile: '$student.profile',
            avatar: '$student.avatar'
          },
          job: {
            id: '$job._id',
            title: '$job.title',
            company: '$job.companyId'
          },
          score: '$topPercentile.score',
          percentile: '$topPercentile.percentile',
          lastUpdated: '$lastUpdated'
        }
      },
      { $sort: { score: -1, percentile: -1 } },
      { $limit: parseInt(limit) }
    ]);

    return successResponse(res, {
      topPerformers,
      totalFound: topPerformers.length
    }, 'Top performers retrieved successfully');

  } catch (error) {
    console.error('Top performers error:', error);
    return errorResponse(res, 'Failed to retrieve top performers', 500);
  }
});

// Get global student leaderboard based on interview performance
const getGlobalLeaderboard = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, category = 'overall', timeframe = 'all-time' } = req.query;

  try {
    const Application = require('../models/Application');
    const User = require('../models/User');

    // Build time filter
    let dateFilter = {};
    if (timeframe === 'this-week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { interviewCompletedAt: { $gte: weekAgo } };
    } else if (timeframe === 'this-month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { interviewCompletedAt: { $gte: monthAgo } };
    }

    // Get all completed interviews with scores
    const applications = await Application.find({
      interviewCompleted: true,
      screeningScore: { $exists: true, $ne: null },
      ...dateFilter
    })
      .populate('candidateId', 'name email profile')
      .populate('jobId', 'title')
      .sort({ screeningScore: -1 })
      .lean();
    
    console.log(`📊 Found ${applications.length} completed interviews with scores`);

    // Group by student and calculate aggregate stats
    const studentStats = {};
    
    applications.forEach(app => {
      if (!app.candidateId) return;
      
      const studentId = app.candidateId._id.toString();
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          student: app.candidateId,
          totalScore: 0,
          interviewsCompleted: 0,
          scores: [],
          applicationsSubmitted: 0,
          offersReceived: 0
        };
      }
      
      studentStats[studentId].scores.push(app.screeningScore);
      studentStats[studentId].interviewsCompleted++;
      studentStats[studentId].totalScore += app.screeningScore;
      studentStats[studentId].applicationsSubmitted++;
      
      // Count offers (shortlisted or hired)
      if (app.status === 'shortlisted' || app.status === 'hired') {
        studentStats[studentId].offersReceived++;
      }
    });
    
    console.log(`👥 Grouped into ${Object.keys(studentStats).length} unique students`);

    // Calculate averages and create leaderboard
    const leaderboard = Object.values(studentStats)
      .map(stats => ({
        student: stats.student,
        score: Math.round(stats.totalScore / stats.interviewsCompleted),
        avgInterviewScore: Math.round(stats.totalScore / stats.interviewsCompleted),
        interviewsCompleted: stats.interviewsCompleted,
        applicationsSubmitted: stats.applicationsSubmitted,
        offersReceived: stats.offersReceived,
        badge: stats.avgInterviewScore >= 85 ? 'Gold' : stats.avgInterviewScore >= 75 ? 'Silver' : 'Bronze',
        streak: Math.min(stats.interviewsCompleted, 30) // Mock streak based on interviews
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    // Get user's position if logged in
    let userPosition = null;
    if (req.user && req.user.role === 'student') {
      const userIndex = leaderboard.findIndex(
        entry => entry.student._id.toString() === req.user.id
      );
      if (userIndex !== -1) {
        userPosition = {
          rank: userIndex + 1,
          score: leaderboard[userIndex].score,
          trend: 'up',
          change: 0
        };
      }
    }

    // Paginate results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLeaderboard = leaderboard.slice(startIndex, endIndex);

    return successResponse(res, {
      leaderboard: paginatedLeaderboard,
      userPosition,
      totalStudents: leaderboard.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(leaderboard.length / limit)
    }, 'Global leaderboard retrieved successfully');

  } catch (error) {
    console.error('Global leaderboard error:', error);
    return errorResponse(res, 'Failed to retrieve global leaderboard: ' + error.message, 500);
  }
});

// Get candidate comparison (for companies to compare multiple candidates)
const compareCandidates = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const { candidateIds } = req.body; // Array of student IDs

  if (req.user.role !== 'company') {
    return errorResponse(res, 'Access denied. Only companies can compare candidates.', 403);
  }

  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length < 2) {
    return errorResponse(res, 'Please provide at least 2 candidate IDs to compare', 400);
  }

  try {
    // Verify job belongs to the company
    const Job = require('../models/Job');
    const job = await Job.findOne({ _id: jobId, companyId: req.user.id });

    if (!job) {
      return errorResponse(res, 'Job not found or access denied', 404);
    }

    const Leaderboard = require('../models/Leaderboard');
    const leaderboard = await Leaderboard.findOne({ jobId })
      .populate('candidates.studentId', 'name email profile avatar');

    if (!leaderboard) {
      return errorResponse(res, 'Leaderboard not found', 404);
    }

    // Get candidates for comparison
    const comparisonData = candidateIds.map(studentId => {
      const candidate = leaderboard.candidates.find(
        c => c.studentId._id.toString() === studentId
      );

      if (!candidate) {
        return { studentId, error: 'Candidate not found' };
      }

      return {
        student: candidate.studentId,
        rank: candidate.rank,
        scores: candidate.scores,
        analysis: candidate.analysis,
        status: candidate.status,
        addedAt: candidate.addedAt
      };
    });

    // Calculate comparison insights
    const insights = {
      highestScore: Math.max(...comparisonData.filter(c => !c.error).map(c => c.scores.overallScore)),
      lowestScore: Math.min(...comparisonData.filter(c => !c.error).map(c => c.scores.overallScore)),
      averageScore: comparisonData.filter(c => !c.error).reduce((sum, c) => sum + c.scores.overallScore, 0) / comparisonData.filter(c => !c.error).length,
      scoreSpread: Math.max(...comparisonData.filter(c => !c.error).map(c => c.scores.overallScore)) - Math.min(...comparisonData.filter(c => !c.error).map(c => c.scores.overallScore))
    };

    return successResponse(res, {
      jobId,
      jobTitle: job.title,
      candidates: comparisonData,
      insights,
      comparedAt: new Date()
    }, 'Candidate comparison completed successfully');

  } catch (error) {
    console.error('Candidate comparison error:', error);
    return errorResponse(res, 'Failed to compare candidates: ' + error.message, 500);
  }
});

module.exports = {
  getLeaderboard,
  generateLeaderboard,
  getCandidatePosition,
  updateCandidateStatus,
  getLeaderboardStats,
  getTopPerformers,
  compareCandidates,
  getGlobalLeaderboard
};
