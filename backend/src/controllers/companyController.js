const Company = require('../models/Company');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
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

  // Find existing company or create new one
  let company = await Company.findOne({ userId });

  if (!company) {
    // Create new company profile
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    company = new Company({
      userId: userId,
      companyName: updateData.companyName || user.profile?.companyName || '',
      email: updateData.email || user.email,
      industry: updateData.industry || user.profile?.industry || '',
      companySize: updateData.companySize || user.profile?.companySize || '1-10',
      ...updateData
    });
  } else {
    // Update existing company
    Object.keys(updateData).forEach(key => {
      if (key !== 'userId') { // Don't allow userId to be changed
        company[key] = updateData[key];
      }
    });
  }

  await company.save();

  console.log('DEBUG: Company profile updated successfully');
  return successResponse(res, company, 'Company profile updated successfully');
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
    company
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
    Company.findOne({ userId })
  ]);

  const stats = {
    activeJobs,
    totalApplications,
    interviewsScheduled,
    candidatesHired,
    profileCompleteness: company?.profileCompleteness || 0
  };

  return successResponse(res, stats, 'Company dashboard stats retrieved successfully');
});

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