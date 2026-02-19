const Job = require("../models/Job");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
const Resume = require("../models/Resume");
const jobMatcherService = require("../services/jobMatcher");
const {
  successResponse,
  errorResponse,
  formatPaginationResponse,
  paginate,
} = require("../utils/helpers");
const { asyncHandler } = require("../middlewares/errorHandler");

// Create new job (company endpoint - compatible with frontend API)
const createJob = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const jobData = req.body;

  console.log("DEBUG: Creating job for company:", userId);
  console.log("DEBUG: Job data received:", jobData); // Verify user is a company

  const company = await Company.findOne({ userId });
  if (!company) {
    return errorResponse(res, "Company profile not found", 404);
  }

  const job = new Job({
    ...jobData,
    companyId: userId,
    postedAt: new Date(),
    status: "active",
  });

  await job.save();

  console.log("DEBUG: Job created successfully with ID:", job._id);
  return successResponse(res, job, "Job created successfully");
});

// Get all jobs with filtering and pagination (compatible with frontend API)
const getAllJobs = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    location,
    type,
    level,
    remote,
    keyword,
    minSalary,
    maxSalary,
    skills,
    companyId,
    locationType,
    postedAfter,
  } = req.query;

  console.log("DEBUG: Fetching jobs with filters:", req.query);

  const filter = { status: "active" };

  // Location filter (city, state, country)
  if (location && location !== "all") {
    filter.$or = [
      { "location.city": new RegExp(location, "i") },
      { "location.state": new RegExp(location, "i") },
      { "location.country": new RegExp(location, "i") },
    ];
  }

  // Job type filter (full-time, part-time, etc.)
  if (type && type !== "all") {
    filter["jobDetails.type"] = type;
  }

  // Experience level filter
  if (level && level !== "all") {
    filter["jobDetails.level"] = level;
  }

  // Work mode filter (remote, hybrid, on-site)
  if (locationType && locationType !== "all") {
    filter["location.type"] = locationType;
  }

  // Legacy remote filter support
  if (remote && remote !== "all") {
    filter["location.type"] = remote === "true" ? "remote" : "on-site";
  }

  // Keyword search in title, description, and skills
  if (keyword) {
    filter.$or = [
      { title: new RegExp(keyword, "i") },
      { description: new RegExp(keyword, "i") },
      { "requirements.skills.name": new RegExp(keyword, "i") },
      { tags: new RegExp(keyword, "i") },
    ];
  }

  // Skills filter
  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(",");
    filter["requirements.skills.name"] = {
      $in: skillsArray.map((skill) => new RegExp(skill.trim(), "i")),
    };
  }

  // Salary range filtering
  if (minSalary || maxSalary) {
    const salaryFilter = {};
    if (minSalary) {
      salaryFilter["compensation.salaryRange.min"] = { $gte: parseInt(minSalary) };
    }
    if (maxSalary) {
      salaryFilter["compensation.salaryRange.max"] = { $lte: parseInt(maxSalary) };
    }
    Object.assign(filter, salaryFilter);
  }

  // Date posted filter
  if (postedAfter) {
    filter.postedDate = { $gte: new Date(postedAfter) };
  }

  // Company filter
  if (companyId) {
    filter.companyId = companyId;
  }

  console.log("DEBUG: MongoDB filter:", JSON.stringify(filter, null, 2));

  const jobs = await Job.find(filter)
    .populate({
      path: "companyId",
      select: "companyName logo industry location companySize",
    })
    .sort({ postedDate: -1, createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Job.countDocuments(filter);

  // Check if user has applied to these jobs
  let jobsWithApplicationStatus = jobs;
  if (req.user && req.user.id) {
    const jobIds = jobs.map(job => job._id);
    const applications = await Application.find({
      candidateId: req.user.id,
      jobId: { $in: jobIds }
    }).select('jobId');
    
    const appliedJobIds = new Set(applications.map(app => app.jobId.toString()));
    
    jobsWithApplicationStatus = jobs.map(job => {
      const jobObj = job.toObject();
      jobObj.hasApplied = appliedJobIds.has(job._id.toString());
      return jobObj;
    });
  }

  console.log("DEBUG: Found", jobs.length, "jobs out of", total, "total");

  return successResponse(
    res,
    {
      jobs: jobsWithApplicationStatus,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total,
      },
    },
    "Jobs retrieved successfully"
  );
});

// Get single job by ID (compatible with frontend API)
const getJobById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const job = await Job.findById(id).populate({
    path: "companyId",
    select:
      "companyName logo industry location companySize description website socialLinks",
  });

  if (!job) {
    return errorResponse(res, "Job not found", 404);
  } // Increment view count

  job.stats.views = (job.stats.views || 0) + 1;
  await job.save();

  return successResponse(res, job, "Job retrieved successfully");
});

// Get job statistics (company endpoint)
const getJobStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const job = await Job.findOne({ _id: id, companyId: userId });
  if (!job) {
    return errorResponse(res, "Job not found or access denied", 404);
  }

  const [totalApplications, newApplications, inReview, interviewed, hired] =
    await Promise.all([
      Application.countDocuments({ jobId: id }),
      Application.countDocuments({
        jobId: id,
        appliedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      }),
      Application.countDocuments({
        jobId: id,
        status: { $in: ["applied", "under-review"] },
      }),
      Application.countDocuments({
        jobId: id,
        status: { $in: ["interview-scheduled", "interviewing", "final-round"] },
      }),
      Application.countDocuments({
        jobId: id,
        status: "hired",
      }),
    ]);

  const stats = {
    totalApplications,
    newApplications,
    inReview,
    interviewed,
    hired,
    views: job.stats.views || 0,
  };

  return successResponse(res, stats, "Job statistics retrieved successfully");
});

// Toggle job status (active/inactive)
const toggleJobStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const job = await Job.findOne({ _id: id, companyId: userId });
  if (!job) {
    return errorResponse(res, "Job not found or access denied", 404);
  }

  job.status = job.status === "active" ? "inactive" : "active";
  await job.save();

  return successResponse(
    res,
    job,
    `Job ${job.status === "active" ? "activated" : "deactivated"} successfully`
  );
});

// Apply to a job (candidate endpoint)
const applyToJob = asyncHandler(async (req, res) => {
  const jobId = req.params.id; // Get jobId from URL parameter
  const candidateId = req.user.id;

  console.log("DEBUG: Candidate", candidateId, "applying to job", jobId); // Check if job exists and is active

  const job = await Job.findById(jobId).populate("companyId");
  if (!job) {
    return errorResponse(res, "Job not found", 404);
  }

  if (job.status !== "active") {
    return errorResponse(res, "Job is no longer active", 400);
  } // Check if already applied

  const existingApplication = await Application.findOne({
    candidateId,
    jobId,
  });

  if (existingApplication) {
    return errorResponse(res, "You have already applied to this job", 400);
  } // Create new application

  const application = new Application({
    candidateId,
    jobId,
    companyId: job.companyId._id,
    status: "applied",
    appliedAt: new Date(),
  });

  await application.save();

  console.log("DEBUG: Application created successfully");
  return successResponse(
    res,
    application,
    "Application submitted successfully"
  );
});

// Get jobs recommended for a candidate
const getRecommendedJobs = asyncHandler(async (req, res) => {
  const candidateId = req.user.id;
  const { limit = 10 } = req.query;

  try {
    // Get candidate's resume
    const resume = await Resume.findOne({
      userId: candidateId,
      isProcessed: true,
    });

    if (!resume) {
      return errorResponse(res, "Resume not found or not processed", 404);
    } // Get active jobs

    const jobs = await Job.find({ status: "active" })
      .populate("companyId", "companyName logo industry location")
      .lean();

    if (jobs.length === 0) {
      return successResponse(
        res,
        {
          recommendedJobs: [],
          message: "No active jobs available",
        },
        "No jobs found for recommendations"
      );
    } // Simple skill matching for now (can be enhanced with jobMatcherService later)

    const candidateSkills = resume.parsedData?.skills || [];
    const jobsWithScore = jobs.map((job) => {
      const jobSkills = job.requirements?.skills || [];
      const matchedSkills = candidateSkills.filter((skill) =>
        jobSkills.some(
          (jobSkill) =>
            jobSkill.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(jobSkill.toLowerCase())
        )
      );
      const score =
        jobSkills.length > 0
          ? (matchedSkills.length / jobSkills.length) * 100
          : 0;
      return {
        ...job,
        matchScore: Math.round(score),
        matchedSkills,
      };
    }); // Sort by match score and limit results

    const recommendedJobs = jobsWithScore
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return successResponse(
      res,
      {
        recommendedJobs,
        totalFound: recommendedJobs.length,
        candidateSkills,
      },
      "Job recommendations generated successfully"
    );
  } catch (error) {
    console.error("Job recommendation error:", error);
    return errorResponse(res, "Failed to generate job recommendations", 500);
  }
});

// Update job (company endpoint - compatible with frontend API)
const updateJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const updateData = req.body;

  const job = await Job.findOne({ _id: id, companyId: userId });
  if (!job) {
    return errorResponse(res, "Job not found or access denied", 404);
  }

  Object.keys(updateData).forEach((key) => {
    if (key !== "companyId" && key !== "postedAt") {
      // Don't allow these to be changed
      job[key] = updateData[key];
    }
  });

  await job.save();

  return successResponse(res, job, "Job updated successfully");
});

// Delete job (company endpoint - compatible with frontend API)
const deleteJob = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const job = await Job.findOne({ _id: id, companyId: userId });
  if (!job) {
    return errorResponse(res, "Job not found or access denied", 404);
  }

  await Job.findByIdAndDelete(id);

  return successResponse(res, null, "Job deleted successfully");
});

// Get company's jobs (company endpoint - compatible with frontend API)
const getCompanyJobs = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const filter = { companyId: userId };
  if (status) {
    filter.status = status;
  }

  const jobs = await Job.find(filter)
    .sort({ postedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Job.countDocuments(filter); // Get application stats for each job

  const jobsWithStats = await Promise.all(
    jobs.map(async (job) => {
      const applicationCount = await Application.countDocuments({
        jobId: job._id,
      });
      return {
        ...job.toObject(),
        applicationCount,
        applicationsCount: applicationCount, // Also include plural for frontend compatibility
      };
    })
  );

  return successResponse(
    res,
    {
      jobs: jobsWithStats,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total,
      },
    },
    "Company jobs retrieved successfully"
  );
});

// Get matched jobs for candidates
const getMatchedJobs = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10,
    location,
    type,
    level,
    keyword,
    minSalary,
    maxSalary,
    skills,
    locationType,
    postedAfter,
  } = req.query;
  const candidateId = req.user.id;

  // Get candidate profile for matching
  const candidate = await Candidate.findOne({ userId: candidateId });
  if (!candidate) {
    return errorResponse(res, "Candidate profile not found", 404);
  }

  // Basic matching based on skills
  const candidateSkills = candidate.skills.map(skill => skill.name.toLowerCase());
  
  // Build base filter for skill matching
  const filter = {
    status: 'active',
    'requirements.skills.name': { 
      $in: candidateSkills.map(skill => new RegExp(skill, 'i')) 
    }
  };

  // Apply additional filters (same logic as getAllJobs)
  if (location && location !== "all") {
    filter.$or = [
      { "location.city": new RegExp(location, "i") },
      { "location.state": new RegExp(location, "i") },
      { "location.country": new RegExp(location, "i") },
    ];
  }

  if (type && type !== "all") {
    filter["jobDetails.type"] = type;
  }

  if (level && level !== "all") {
    filter["jobDetails.level"] = level;
  }

  if (locationType && locationType !== "all") {
    filter["location.type"] = locationType;
  }

  if (keyword) {
    const keywordFilter = [
      { title: new RegExp(keyword, "i") },
      { description: new RegExp(keyword, "i") },
      { "requirements.skills.name": new RegExp(keyword, "i") },
      { tags: new RegExp(keyword, "i") },
    ];
    
    // Combine with existing $or filter if it exists
    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: keywordFilter }
      ];
      delete filter.$or;
    } else {
      filter.$or = keywordFilter;
    }
  }

  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(",");
    // Add to existing skills filter
    const additionalSkills = skillsArray.map((skill) => new RegExp(skill.trim(), "i"));
    filter["requirements.skills.name"].$in = [...filter["requirements.skills.name"].$in, ...additionalSkills];
  }

  if (minSalary || maxSalary) {
    if (minSalary) {
      filter["compensation.salaryRange.min"] = { $gte: parseInt(minSalary) };
    }
    if (maxSalary) {
      filter["compensation.salaryRange.max"] = { $lte: parseInt(maxSalary) };
    }
  }

  if (postedAfter) {
    filter.postedDate = { $gte: new Date(postedAfter) };
  }

  console.log("DEBUG: Matched jobs filter:", JSON.stringify(filter, null, 2));
  
  const jobs = await Job.find(filter)
  .populate({
    path: "companyId",
    select: "companyName logo industry location"
  })
  .limit(limit * 1)
  .skip((page - 1) * limit)
  .sort({ createdAt: -1 });

  const total = await Job.countDocuments(filter);

  // Check if user has applied to these jobs
  const jobIds = jobs.map(job => job._id);
  const applications = await Application.find({
    candidateId: candidateId,
    jobId: { $in: jobIds }
  }).select('jobId');
  
  const appliedJobIds = new Set(applications.map(app => app.jobId.toString()));
  
  const jobsWithApplicationStatus = jobs.map(job => {
    const jobObj = job.toObject();
    jobObj.hasApplied = appliedJobIds.has(job._id.toString());
    return jobObj;
  });

  return successResponse(
    res,
    {
      jobs: jobsWithApplicationStatus,
      candidateSkills: candidateSkills,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total,
      },
    },
    "Matched jobs retrieved successfully"
  );
});

// Get enhanced matched jobs with scoring
const getEnhancedMatchedJobs = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10,
    location,
    type,
    level,
    keyword,
    minSalary,
    maxSalary,
    skills,
    locationType,
    postedAfter,
  } = req.query;
  const candidateId = req.user.id;

  // Get candidate profile
  const candidate = await Candidate.findOne({ userId: candidateId });
  if (!candidate) {
    return errorResponse(res, "Candidate profile not found", 404);
  }

  // Build filter for jobs (same logic as getAllJobs)
  const filter = { status: 'active' };

  if (location && location !== "all") {
    filter.$or = [
      { "location.city": new RegExp(location, "i") },
      { "location.state": new RegExp(location, "i") },
      { "location.country": new RegExp(location, "i") },
    ];
  }

  if (type && type !== "all") {
    filter["jobDetails.type"] = type;
  }

  if (level && level !== "all") {
    filter["jobDetails.level"] = level;
  }

  if (locationType && locationType !== "all") {
    filter["location.type"] = locationType;
  }

  if (keyword) {
    const keywordFilter = [
      { title: new RegExp(keyword, "i") },
      { description: new RegExp(keyword, "i") },
      { "requirements.skills.name": new RegExp(keyword, "i") },
      { tags: new RegExp(keyword, "i") },
    ];
    
    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: keywordFilter }
      ];
      delete filter.$or;
    } else {
      filter.$or = keywordFilter;
    }
  }

  if (skills) {
    const skillsArray = Array.isArray(skills) ? skills : skills.split(",");
    filter["requirements.skills.name"] = {
      $in: skillsArray.map((skill) => new RegExp(skill.trim(), "i")),
    };
  }

  if (minSalary || maxSalary) {
    if (minSalary) {
      filter["compensation.salaryRange.min"] = { $gte: parseInt(minSalary) };
    }
    if (maxSalary) {
      filter["compensation.salaryRange.max"] = { $lte: parseInt(maxSalary) };
    }
  }

  if (postedAfter) {
    filter.postedDate = { $gte: new Date(postedAfter) };
  }

  console.log("DEBUG: Enhanced matched jobs filter:", JSON.stringify(filter, null, 2));

  // Get filtered jobs
  const jobs = await Job.find(filter)
    .populate({
      path: "companyId",
      select: "companyName logo industry location"
    })
    .sort({ createdAt: -1 });

  // Calculate match scores
  const candidateSkills = candidate.skills.map(skill => skill.name.toLowerCase());
  const jobsWithScores = jobs.map(job => {
    let score = 0;
    const jobSkills = job.requirements.skills.map(skill => skill.name.toLowerCase());
    
    // Skill matching
    const matchingSkills = candidateSkills.filter(skill => 
      jobSkills.some(jobSkill => jobSkill.includes(skill) || skill.includes(jobSkill))
    );
    score += (matchingSkills.length / Math.max(jobSkills.length, 1)) * 60;

    // Experience level matching
    if (candidate.experience && job.requirements.experience) {
      const candidateYears = candidate.experience.reduce((total, exp) => total + (exp.years || 0), 0);
      const requiredYears = job.requirements.experience.minYears || 0;
      if (candidateYears >= requiredYears) {
        score += 20;
      }
    }

    // Location preference (placeholder)
    score += 10;

    return {
      ...job.toObject(),
      matchScore: Math.round(score),
      hasApplied: false // Will be updated below
    }
  });

  // Check if user has applied to these jobs
  const jobIds = jobs.map(job => job._id);
  const applications = await Application.find({
    candidateId: candidateId,
    jobId: { $in: jobIds }
  }).select('jobId');
  
  const appliedJobIds = new Set(applications.map(app => app.jobId.toString()));
  
  // Update hasApplied status
  jobsWithScores.forEach(job => {
    job.hasApplied = appliedJobIds.has(job._id.toString());
  });

  // Sort by match score and paginate
  const sortedJobs = jobsWithScores
    .filter(job => job.matchScore > 30)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice((page - 1) * limit, page * limit);

  const total = jobsWithScores.filter(job => job.matchScore > 30).length;

  return successResponse(
    res,
    {
      jobs: sortedJobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total,
      },
    },
    "Enhanced matched jobs retrieved successfully"
  );
});

// Get job applications for a specific job (company only)
const getJobApplications = asyncHandler(async (req, res) => {
  const { id: jobId } = req.params;
  const { page = 1, limit = 10, status } = req.query;
  const companyId = req.user.id;
  const mongoose = require('mongoose');

  console.log('🔍 getJobApplications called with:');
  console.log('  jobId:', jobId);
  console.log('  companyId:', companyId);
  console.log('  status filter:', status);

  // Verify job belongs to company
  const job = await Job.findOne({ _id: jobId, companyId });
  console.log('  Job found:', !!job);
  if (!job) {
    console.log('  ❌ Job not found or unauthorized');
    return errorResponse(res, "Job not found or unauthorized", 404);
  }
  console.log('  ✅ Job verified:', job.title);

  // Build filter - Convert jobId string to ObjectId for proper matching
  const filter = { jobId: new mongoose.Types.ObjectId(jobId) };
  if (status && status !== 'undefined' && status !== 'null') {
    filter.status = status;
  }
  console.log('  Filter:', JSON.stringify(filter));

  // Check all applications for this job
  const allApps = await Application.find({ jobId: new mongoose.Types.ObjectId(jobId) });
  console.log('  Total applications for this job (no filters):', allApps.length);
  if (allApps.length > 0) {
    console.log('  Sample application:', {
      _id: allApps[0]._id,
      candidateId: allApps[0].candidateId,
      status: allApps[0].status,
      interviewScore: allApps[0].interviewScore
    });
  }

  const applications = await Application.find(filter)
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ appliedAt: -1 });

  console.log('  Applications returned after populate:', applications.length);

  // Populate interview conversation data for each application
  const Interview = require('../models/Interview');
  for (let app of applications) {
    if (app.interviewCompleted && app.applicationId) {
      try {
        const interview = await Interview.findOne({ applicationId: app._id })
          .select('conversation')
          .lean();
        
        if (interview && interview.conversation && interview.conversation.length > 0) {
          // Transform conversation to interviewTranscript format
          const transcript = [];
          interview.conversation.forEach((item, index) => {
            if (item.question) {
              transcript.push({
                type: 'question',
                content: item.question,
                timestamp: item.timestamp,
                questionNumber: item.questionId || Math.floor(index / 2) + 1
              });
            }
            if (item.answerTranscript || item.content) {
              transcript.push({
                type: 'answer',
                content: item.answerTranscript || item.content,
                timestamp: item.timestamp,
                questionNumber: item.questionId || Math.floor(index / 2) + 1
              });
            }
          });
          
          // Update the application object with transcript
          app.interviewTranscript = transcript;
          console.log(`  ✅ Populated ${transcript.length} transcript entries for application ${app._id}`);
        }
      } catch (error) {
        console.error(`  ⚠️ Error fetching interview for application ${app._id}:`, error.message);
      }
    }
  }

  const total = await Application.countDocuments(filter);
  console.log('  Total count:', total);

  return successResponse(
    res,
    {
      applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total: total,
      },
    },
    "Job applications retrieved successfully"
  );
});

module.exports = {
  getAllJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getCompanyJobs,
  getJobStats,
  toggleJobStatus,
  getRecommendedJobs,
  applyToJob,
  getMatchedJobs,
  getEnhancedMatchedJobs,
  getJobApplications,
};
