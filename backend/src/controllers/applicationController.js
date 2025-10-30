const Application = require('../models/Application');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Apply to a job (candidate endpoint)
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  const candidateId = req.user.id;

  console.log('DEBUG: Candidate', candidateId, 'applying to job', jobId);

  // Check if job exists and is active
  const job = await Job.findById(jobId).populate('companyId');
  if (!job) {
    return errorResponse(res, 'Job not found', 404);
  }

  if (job.status !== 'active') {
    return errorResponse(res, 'Job is no longer active', 400);
  }

  // Check if already applied
  const existingApplication = await Application.findOne({
    candidateId,
    jobId
  });

  if (existingApplication) {
    return errorResponse(res, 'You have already applied to this job', 400);
  }

  // Create new application
  const application = new Application({
    candidateId,
    jobId,
    companyId: job.companyId._id,
    status: 'applied',
    appliedAt: new Date()
  });

  await application.save();

  console.log('DEBUG: Application created successfully');
  return successResponse(res, application, 'Application submitted successfully');
});

// Get all applications for a candidate
const getApplications = asyncHandler(async (req, res) => {
  const candidateId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const filter = { candidateId };
  if (status) {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'jobId',
      select: 'title description type location salary companyId postedAt',
      populate: {
        path: 'companyId',
        select: 'companyName logo industry'
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
  }, 'Applications retrieved successfully');
});

// Get single application by ID
const getApplicationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const candidateId = req.user.id;

  const application = await Application.findOne({ _id: id, candidateId })
    .populate({
      path: 'jobId',
      select: 'title description requirements compensation type location companyId',
      populate: {
        path: 'companyId',
        select: 'companyName logo industry location description website'
      }
    });

  if (!application) {
    return errorResponse(res, 'Application not found', 404);
  }

  return successResponse(res, application, 'Application retrieved successfully');
});

// Update application status (candidate can withdraw)
const updateApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const candidateId = req.user.id;

  const application = await Application.findOne({ _id: id, candidateId });
  
  if (!application) {
    return errorResponse(res, 'Application not found', 404);
  }

  // Candidates can only withdraw applications or respond to offers
  const allowedStatuses = ['withdrawn', 'offer-accepted', 'offer-declined'];
  if (!allowedStatuses.includes(status)) {
    return errorResponse(res, 'Invalid status for candidate', 400);
  }

  application.status = status;
  await application.save();

  return successResponse(res, application, 'Application updated successfully');
});

// Delete/withdraw application
const deleteApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const candidateId = req.user.id;

  const application = await Application.findOne({ _id: id, candidateId });
  
  if (!application) {
    return errorResponse(res, 'Application not found', 404);
  }

  // Only allow deletion if application is in certain states
  const allowedStatuses = ['applied', 'under-review'];
  if (!allowedStatuses.includes(application.status)) {
    return errorResponse(res, 'Cannot withdraw application at this stage', 400);
  }

  await Application.findByIdAndDelete(id);

  return successResponse(res, null, 'Application withdrawn successfully');
});

// Get application statistics for candidate
const getApplicationStats = asyncHandler(async (req, res) => {
  const candidateId = req.user.id;

  const [
    totalApplications,
    pendingApplications,
    interviewApplications,
    rejectedApplications,
    acceptedApplications
  ] = await Promise.all([
    Application.countDocuments({ candidateId }),
    Application.countDocuments({ 
      candidateId, 
      status: { $in: ['applied', 'under-review'] } 
    }),
    Application.countDocuments({ 
      candidateId, 
      status: { $in: ['interview-scheduled', 'interviewing', 'final-round'] } 
    }),
    Application.countDocuments({ 
      candidateId, 
      status: 'rejected' 
    }),
    Application.countDocuments({ 
      candidateId, 
      status: { $in: ['offer-extended', 'offer-accepted', 'hired'] } 
    })
  ]);

  const stats = {
    totalApplications,
    pendingApplications,
    interviewApplications,
    rejectedApplications,
    acceptedApplications
  };

  return successResponse(res, stats, 'Application statistics retrieved successfully');
});

// COMPANY ENDPOINTS

// Get all applications for a company
const getCompanyApplications = asyncHandler(async (req, res) => {
  const companyId = req.user.id;
  const { page = 1, limit = 10, status, jobId } = req.query;

  const filter = { companyId };
  if (status) {
    filter.status = status;
  }
  if (jobId) {
    filter.jobId = jobId;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'candidateId',
      select: 'name email profile',
      populate: {
        path: 'profile',
        select: 'phone university degree skills'
      }
    })
    .populate('jobId', 'title type location')
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
  }, 'Company applications retrieved successfully');
});

// Update application status (company endpoint)
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const companyId = req.user.id;

  // Find the application and verify it belongs to this company
  const application = await Application.findOne({ _id: id, companyId });
  
  if (!application) {
    return errorResponse(res, 'Application not found', 404);
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
  // Candidate endpoints
  applyToJob,
  getApplications,
  getApplicationById,
  updateApplication,
  deleteApplication,
  getApplicationStats,
  
  // Company endpoints
  getCompanyApplications,
  updateApplicationStatus
};