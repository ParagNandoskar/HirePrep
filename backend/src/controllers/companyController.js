const Company = require('../models/Company');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const mongoose = require('mongoose');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Get company profile
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Try to find existing company profile
  let company = await Company.findOne({ userId });

  if (!company) {
    // If no company profile exists, create one with basic info from User
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    company = new Company({
      userId: userId,
      companyName: user.profile?.companyName || '',
      email: user.email,
      industry: user.profile?.industry || '',
      companySize: user.profile?.companySize || '1-10',
      description: user.profile?.description || ''
    });
    
    await company.save();
  }

  return successResponse(res, company, 'Company profile retrieved successfully');
});

// Update company profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updateData = req.body;

  console.log('DEBUG: Updating company profile for user:', userId);
  console.log('DEBUG: Update data received:', updateData);

  try {
    // Get user info for defaults
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    // Filter out userId and email from updateData to prevent overrides
    const { userId: _, email: __, ...cleanUpdateData } = updateData;

    // Use findOneAndUpdate with upsert to safely create or update
    const company = await Company.findOneAndUpdate(
      { userId: userId },
      {
        userId: userId,
        email: user.email, // Ensure email is always the user's email
        ...cleanUpdateData
      },
      {
        upsert: true, // Create if doesn't exist
        new: true,    // Return updated document
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('DEBUG: Company profile updated successfully');
    return successResponse(res, company, 'Company profile updated successfully');
  } catch (error) {
    console.error('DEBUG: Error updating company profile:', error);

    // Handle duplicate key errors specifically
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0];
      if (field === 'email') {
        return errorResponse(res, 'This email is already associated with another company. Please use a different email or contact support.', 400);
      }
      if (field === 'userId') {
        return errorResponse(res, 'Company profile already exists for this user', 400);
      }
    }

    throw error; // Let global error handler deal with it
  }
});

// Upload company logo
const uploadLogo = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  if (!req.file) {
    return errorResponse(res, 'No file uploaded', 400);
  }

  const company = await Company.findOne({ userId });
  if (!company) {
    return errorResponse(res, 'Company profile not found', 404);
  }

  // The file should be uploaded to S3 via multer middleware
  company.logo = req.file.location; // S3 URL
  await company.save();

  return successResponse(res, { logo: company.logo }, 'Logo uploaded successfully');
});

// Get company dashboard stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    activeJobs,
    totalApplications,
    interviewsScheduled,
    candidatesHired,
    company,
    recentApplicationsData,
    applicationStatusCounts
  ] = await Promise.all([
    Job.countDocuments({ companyId: userId, status: 'active' }),
    Application.countDocuments({ companyId: userId }),
    Application.countDocuments({ 
      companyId: userId, 
      status: { $in: ['interview-scheduled', 'interviewing'] } 
    }),
    Application.countDocuments({ 
      companyId: userId, 
      status: 'hired' 
    }),
    Company.findOne({ userId }),
    // Get recent applications with candidate info and job details
    Application.find({ companyId: userId })
      .populate('candidateId', 'name email')
      .populate('jobId', 'title')
      .sort({ appliedAt: -1 })
      .limit(10),
    // Get applications count by status
    Application.aggregate([
      { $match: { companyId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  // Format recent applications
  const recentApplications = recentApplicationsData.map(app => ({
    id: app._id,
    candidateName: app.candidateId?.name || 'Unknown',
    role: app.jobId?.title || 'Unknown Position',
    status: formatStatus(app.status),
    score: (app.screeningScore ?? app.interviewScore ?? app.matchScore?.overall) != null
      ? `${Math.round(app.screeningScore ?? app.interviewScore ?? app.matchScore.overall)}%`
      : 'N/A'
  }));

  // Format applications by status for pie chart
  const statusColorMap = {
    'applied': { name: 'Applied', color: '#3b82f6' },
    'under-review': { name: 'Reviewing', color: '#60a5fa' },
    'screening': { name: 'Screening', color: '#93c5fd' },
    'shortlisted': { name: 'Shortlisted', color: '#10b981' },
    'interview-scheduled': { name: 'Interview Scheduled', color: '#f59e0b' },
    'interviewing': { name: 'Interviewing', color: '#f97316' },
    'interviewed': { name: 'Interviewed', color: '#a855f7' },
    'rejected': { name: 'Rejected', color: '#ef4444' },
    'hired': { name: 'Hired', color: '#8b5cf6' }
  };

  const applicationsByStatus = applicationStatusCounts
    .filter(item => item._id && item.count > 0)
    .map(item => ({
      name: statusColorMap[item._id]?.name || item._id,
      value: item.count,
      color: statusColorMap[item._id]?.color || '#6b7280'
    }));

  const stats = {
    activeJobs,
    totalApplications,
    interviewsScheduled,
    candidatesHired,
    profileCompleteness: company?.profileCompleteness || 0,
    recentApplications,
    applicationsByStatus
  };

  return successResponse(res, stats, 'Company dashboard stats retrieved successfully');
});

// Helper function to format status for display
const formatStatus = (status) => {
  const statusMap = {
    'applied': 'Applied',
    'under-review': 'Reviewing',
    'screening': 'Screening',
    'shortlisted': 'Shortlisted',
    'interview-scheduled': 'Interview Scheduled',
    'interviewing': 'Interviewing',
    'interviewed': 'Interviewed',
    'rejected': 'Rejected',
    'hired': 'Hired'
  };
  return statusMap[status] || status;
};

// Get job applications for a specific job
const getJobApplications = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  // Verify the job belongs to this company
  const job = await Job.findOne({ _id: jobId, companyId: userId });
  if (!job) {
    return errorResponse(res, 'Job not found or access denied', 404);
  }

  const filter = { jobId: jobId };
  if (status) {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'candidateId',
      select: 'name email profile',
      populate: {
        path: 'profile',
        select: 'phone university degree'
      }
    })
    .sort({ appliedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Application.countDocuments(filter);

  return successResponse(res, {
    applications,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total: total
    }
  }, 'Job applications retrieved successfully');
});

// Update application status
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  // Find the application and verify it belongs to this company
  const application = await Application.findById(applicationId).populate('jobId');
  
  if (!application) {
    return errorResponse(res, 'Application not found', 404);
  }

  if (application.jobId.companyId.toString() !== userId) {
    return errorResponse(res, 'Access denied', 403);
  }

  // Validate status
  const validStatuses = [
    'applied', 'under-review', 'screening', 'assessment', 
    'interview-scheduled', 'interviewing', 'final-round', 
    'decision-pending', 'offer-extended', 'hired', 'rejected'
  ];

  if (!validStatuses.includes(status)) {
    return errorResponse(res, 'Invalid status', 400);
  }

  application.status = status;
  await application.save();

  return successResponse(res, application, 'Application status updated successfully');
});

module.exports = {
  getProfile,
  updateProfile,
  uploadLogo,
  getDashboardStats,
  getJobApplications,
  updateApplicationStatus
};