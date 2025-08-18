const Job = require('../models/Job');
const Resume = require('../models/Resume');
const jobMatcherService = require('../services/jobMatcher');
const { successResponse, errorResponse, formatPaginationResponse, paginate } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Create a new job posting (company only)
const createJob = asyncHandler(async (req, res) => {
  const companyId = req.user.id;
  const jobData = { ...req.body, companyId };

  try {
    // Generate embeddings for the job
    const embedding = await jobMatcherService.generateJobEmbeddings(jobData);
    jobData.embedding = embedding;

    const job = new Job(jobData);
    await job.save();

    // Populate company information
    await job.populate('companyId', 'name profile');

    return successResponse(res, {
      job: {
        id: job._id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        compensation: job.compensation,
        jobType: job.jobType,
        status: job.status,
        applicationDeadline: job.applicationDeadline,
        tags: job.tags,
        company: job.companyId,
        applicants: job.applicants,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      }
    }, 'Job posted successfully', 201);
  } catch (error) {
    console.error('Job creation error:', error);
    return errorResponse(res, 'Failed to create job posting: ' + error.message, 500);
  }
});

// Get all jobs with filtering and pagination
const getJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search,
    jobType,
    location,
    salaryMin,
    salaryMax,
    tags,
    companyId,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build query
  const query = { status: 'active' };

  // Search filter
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { 'requirements.skills.name': { $regex: search, $options: 'i' } }
    ];
  }

  // Job type filter
  if (jobType) {
    query.jobType = jobType;
  }

  // Location filter
  if (location) {
    query['requirements.location.type'] = { $regex: location, $options: 'i' };
  }

  // Salary range filter
  if (salaryMin || salaryMax) {
    query['compensation.salaryMin'] = {};
    if (salaryMin) query['compensation.salaryMin'].$gte = parseInt(salaryMin);
    if (salaryMax) query['compensation.salaryMax'] = { $lte: parseInt(salaryMax) };
  }

  // Tags filter
  if (tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    query.tags = { $in: tagArray };
  }

  // Company filter
  if (companyId) {
    query.companyId = companyId;
  }

  try {
    // Get total count for pagination
    const total = await Job.countDocuments(query);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute paginated query
    const jobs = await Job.find(query)
      .populate('companyId', 'name profile avatar')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Format response
    const jobsData = jobs.map(job => ({
      id: job._id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      compensation: job.compensation,
      jobType: job.jobType,
      status: job.status,
      applicationDeadline: job.applicationDeadline,
      tags: job.tags,
      company: job.companyId,
      applicantsCount: job.applicants.length,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));

    const paginatedResponse = formatPaginationResponse(jobsData, page, limit, total);

    return successResponse(res, paginatedResponse, 'Jobs retrieved successfully');
  } catch (error) {
    console.error('Jobs retrieval error:', error);
    return errorResponse(res, 'Failed to retrieve jobs', 500);
  }
});

// Get specific job by ID
const getJobById = asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const job = await Job.findById(jobId)
    .populate('companyId', 'name profile avatar')
    .populate({
      path: 'applicants.studentId',
      select: 'name email profile avatar'
    });

  if (!job) {
    return errorResponse(res, 'Job not found', 404);
  }

  // Check if current user has applied (for students)
  let hasApplied = false;
  let applicationStatus = null;

  if (req.user && req.user.role === 'student') {
    const application = job.applicants.find(
      app => app.studentId._id.toString() === req.user.id
    );
    hasApplied = !!application;
    applicationStatus = application?.status || null;
  }

  return successResponse(res, {
    job: {
      id: job._id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      compensation: job.compensation,
      jobType: job.jobType,
      status: job.status,
      applicationDeadline: job.applicationDeadline,
      tags: job.tags,
      company: job.companyId,
      applicants: req.user?.role === 'company' && req.user.id === job.companyId._id.toString() 
        ? job.applicants 
        : [],
      applicantsCount: job.applicants.length,
      hasApplied,
      applicationStatus,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }
  }, 'Job retrieved successfully');
});

// Get jobs recommended for a student
const getRecommendedJobs = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.user.id;
  const { limit = 10 } = req.query;

  // Check if user is accessing their own recommendations
  if (req.user.id !== studentId && req.user.role !== 'company') {
    return errorResponse(res, 'Access denied', 403);
  }

  try {
    // Get student's resume
    const resume = await Resume.findOne({ userId: studentId, isProcessed: true });

    if (!resume) {
      return errorResponse(res, 'Resume not found or not processed', 404);
    }

    // Get active jobs
    const jobs = await Job.find({ status: 'active' })
      .populate('companyId', 'name profile avatar')
      .lean();

    if (jobs.length === 0) {
      return successResponse(res, {
        recommendedJobs: [],
        message: 'No active jobs available'
      }, 'No jobs found for recommendations');
    }

    // Find matching jobs
    const matchingJobs = await jobMatcherService.findMatchingJobs(resume, jobs, parseInt(limit));

    // Format response
    const recommendedJobs = matchingJobs.map(match => ({
      job: {
        id: match.job._id,
        title: match.job.title,
        description: match.job.description,
        requirements: match.job.requirements,
        compensation: match.job.compensation,
        jobType: match.job.jobType,
        tags: match.job.tags,
        company: match.job.companyId,
        applicantsCount: match.job.applicants.length,
        createdAt: match.job.createdAt
      },
      matchScore: match.matchScore.overall,
      matchDetails: match.details,
      reasons: [
        `${match.details.skillsMatch.toFixed(0)}% skills match`,
        `${match.details.experienceMatch.toFixed(0)}% experience match`,
        `${match.details.semanticSimilarity.toFixed(0)}% semantic similarity`
      ]
    }));

    return successResponse(res, {
      recommendedJobs,
      totalFound: matchingJobs.length,
      resumeAnalysis: {
        skills: resume.parsedData?.skills?.length || 0,
        experience: resume.parsedData?.experience?.length || 0,
        overallScore: resume.aiAnalysis?.overallScore || 0
      }
    }, 'Job recommendations generated successfully');

  } catch (error) {
    console.error('Job recommendation error:', error);
    return errorResponse(res, 'Failed to generate job recommendations', 500);
  }
});

// Apply to a job (student only)
const applyToJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const studentId = req.user.id;

  try {
    // Get job and student's resume
    const [job, resume] = await Promise.all([
      Job.findById(jobId),
      Resume.findOne({ userId: studentId, isProcessed: true })
    ]);

    if (!job) {
      return errorResponse(res, 'Job not found', 404);
    }

    if (job.status !== 'active') {
      return errorResponse(res, 'Job is no longer active', 400);
    }

    if (!resume) {
      return errorResponse(res, 'Please upload and process your resume before applying', 400);
    }

    // Check if already applied
    const existingApplication = job.applicants.find(
      app => app.studentId.toString() === studentId
    );

    if (existingApplication) {
      return errorResponse(res, 'You have already applied to this job', 400);
    }

    // Calculate match score
    const matchScore = await jobMatcherService.calculateJobMatchScore(resume, job);

    // Add application
    job.applicants.push({
      studentId,
      matchScore: matchScore.overall,
      appliedAt: new Date()
    });

    await job.save();

    return successResponse(res, {
      jobId: job._id,
      jobTitle: job.title,
      matchScore: matchScore.overall,
      applicationStatus: 'applied',
      appliedAt: new Date()
    }, 'Application submitted successfully', 201);

  } catch (error) {
    console.error('Job application error:', error);
    return errorResponse(res, 'Failed to submit application', 500);
  }
});

// Update job posting (company only)
const updateJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const companyId = req.user.id;
  const updateData = req.body;

  try {
    const job = await Job.findOne({ _id: jobId, companyId });

    if (!job) {
      return errorResponse(res, 'Job not found or access denied', 404);
    }

    // Update job fields
    Object.keys(updateData).forEach(key => {
      if (key !== 'companyId' && key !== 'applicants') {
        job[key] = updateData[key];
      }
    });

    // Regenerate embeddings if job content changed
    if (updateData.title || updateData.description || updateData.requirements) {
      const embedding = await jobMatcherService.generateJobEmbeddings(job);
      job.embedding = embedding;
    }

    await job.save();
    await job.populate('companyId', 'name profile');

    return successResponse(res, {
      job: {
        id: job._id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        compensation: job.compensation,
        jobType: job.jobType,
        status: job.status,
        applicationDeadline: job.applicationDeadline,
        tags: job.tags,
        company: job.companyId,
        applicants: job.applicants,
        updatedAt: job.updatedAt
      }
    }, 'Job updated successfully');

  } catch (error) {
    console.error('Job update error:', error);
    return errorResponse(res, 'Failed to update job', 500);
  }
});

// Delete job posting (company only)
const deleteJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const companyId = req.user.id;

  const job = await Job.findOne({ _id: jobId, companyId });

  if (!job) {
    return errorResponse(res, 'Job not found or access denied', 404);
  }

  await Job.findByIdAndDelete(jobId);

  return successResponse(res, null, 'Job deleted successfully');
});

// Get company's jobs
const getCompanyJobs = asyncHandler(async (req, res) => {
  const companyId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const query = { companyId };
  if (status) query.status = status;

  try {
    const total = await Job.countDocuments(query);
    
    const jobs = await Job.find(query)
      .populate('companyId', 'name profile')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const jobsData = jobs.map(job => ({
      id: job._id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      compensation: job.compensation,
      jobType: job.jobType,
      status: job.status,
      applicationDeadline: job.applicationDeadline,
      tags: job.tags,
      applicantsCount: job.applicants.length,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));

    const paginatedResponse = formatPaginationResponse(jobsData, page, limit, total);

    return successResponse(res, paginatedResponse, 'Company jobs retrieved successfully');
  } catch (error) {
    console.error('Company jobs retrieval error:', error);
    return errorResponse(res, 'Failed to retrieve company jobs', 500);
  }
});

// Update application status (company only)
const updateApplicationStatus = asyncHandler(async (req, res) => {
  const { jobId, studentId } = req.params;
  const { status } = req.body;
  const companyId = req.user.id;

  const validStatuses = ['applied', 'reviewed', 'interviewed', 'rejected', 'hired'];
  if (!validStatuses.includes(status)) {
    return errorResponse(res, 'Invalid status', 400);
  }

  try {
    const job = await Job.findOne({ _id: jobId, companyId });

    if (!job) {
      return errorResponse(res, 'Job not found or access denied', 404);
    }

    const applicationIndex = job.applicants.findIndex(
      app => app.studentId.toString() === studentId
    );

    if (applicationIndex === -1) {
      return errorResponse(res, 'Application not found', 404);
    }

    job.applicants[applicationIndex].status = status;
    await job.save();

    return successResponse(res, {
      jobId,
      studentId,
      newStatus: status,
      updatedAt: new Date()
    }, 'Application status updated successfully');

  } catch (error) {
    console.error('Application status update error:', error);
    return errorResponse(res, 'Failed to update application status', 500);
  }
});

module.exports = {
  createJob,
  getJobs,
  getJobById,
  getRecommendedJobs,
  applyToJob,
  updateJob,
  deleteJob,
  getCompanyJobs,
  updateApplicationStatus
};
