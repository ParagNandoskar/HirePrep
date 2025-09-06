const express = require('express');
const { authenticateToken, authorizeRole, optionalAuth } = require('../middleware/auth');
const Job = require('../models/Job');
const Company = require('../models/Company');
const Candidate = require('../models/Candidate');
const axios = require('axios');

const router = express.Router();

// @route   GET /api/jobs
// @desc    Get all active jobs with filtering and pagination
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      jobType,
      level,
      skills,
      company,
      salaryMin,
      salaryMax
    } = req.query;

    // Build search query
    const query = { status: 'active' };

    if (search) {
      query.$text = { $search: search };
    }

    if (location) {
      query.$or = [
        { 'location.city': new RegExp(location, 'i') },
        { 'location.state': new RegExp(location, 'i') },
        { 'location.country': new RegExp(location, 'i') }
      ];
    }

    if (jobType) {
      query['jobDetails.type'] = jobType;
    }

    if (level) {
      query['jobDetails.level'] = level;
    }

    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query['requirements.skills.name'] = { $in: skillsArray.map(s => new RegExp(s, 'i')) };
    }

    if (company) {
      query.company = company;
    }

    if (salaryMin || salaryMax) {
      query['compensation.salaryRange'] = {};
      if (salaryMin) query['compensation.salaryRange.min'] = { $gte: parseInt(salaryMin) };
      if (salaryMax) query['compensation.salaryRange.max'] = { $lte: parseInt(salaryMax) };
    }

    const jobs = await Job.find(query)
      .populate('company', 'companyName industry logo location')
      .select('-applications') // Exclude applications for public view
      .sort({ postedDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// @route   GET /api/jobs/:id
// @desc    Get single job by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'companyName industry logo location website description benefits culture');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Increment view count
    job.analytics.views += 1;
    await job.save();

    // Remove applications from response for non-company users
    const jobResponse = job.toObject();
    if (!req.user || req.user.role !== 'company') {
      delete jobResponse.applications;
    }

    res.json(jobResponse);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// @route   POST /api/jobs
// @desc    Create a new job posting
// @access  Private (Company only)
router.post('/', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    const jobData = {
      ...req.body,
      company: company._id
    };

    const job = new Job(jobData);
    await job.save();

    await job.populate('company', 'companyName industry logo location');

    res.status(201).json({
      message: 'Job created successfully',
      job
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Failed to create job' });
  }
});

// @route   PUT /api/jobs/:id
// @desc    Update job posting
// @access  Private (Company only)
router.put('/:id', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, company: company._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('company', 'companyName industry logo location');

    if (!job) {
      return res.status(404).json({ message: 'Job not found or access denied' });
    }

    res.json({
      message: 'Job updated successfully',
      job
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ message: 'Failed to update job' });
  }
});

// @route   DELETE /api/jobs/:id
// @desc    Delete job posting
// @access  Private (Company only)
router.delete('/:id', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    const job = await Job.findOneAndDelete({ _id: req.params.id, company: company._id });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or access denied' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ message: 'Failed to delete job' });
  }
});

// @route   GET /api/jobs/company/my-jobs
// @desc    Get company's job postings
// @access  Private (Company only)
router.get('/company/my-jobs', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    const query = { company: company._id };
    if (status) query.status = status;

    const jobs = await Job.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Job.countDocuments(query);

    res.json({
      jobs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({ message: 'Failed to fetch company jobs' });
  }
});

// @route   POST /api/jobs/:id/apply
// @desc    Apply for a job
// @access  Private (Candidate only)
router.post('/:id/apply', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ user: req.user._id });
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    const job = await Job.findById(req.params.id);
    if (!job || job.status !== 'active') {
      return res.status(404).json({ message: 'Job not found or not active' });
    }

    // Check if already applied
    const existingApplication = job.applications.find(
      app => app.candidate.toString() === candidate._id.toString()
    );

    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Check if candidate has a resume
    if (!candidate.resume || !candidate.resume.s3Url) {
      return res.status(400).json({ message: 'Please upload a resume before applying' });
    }

    // Calculate match score using NLP service
    let matchScore = 0;
    try {
      const nlpResponse = await axios.post(`${process.env.NLP_SERVICE_URL}/calculate-match`, {
        candidateData: {
          skills: candidate.skills,
          experience: candidate.experience,
          education: candidate.education,
          resume: candidate.resume.extractedData
        },
        jobRequirements: job.requirements,
        jobDescription: job.description
      }, {
        timeout: 10000
      });

      if (nlpResponse.data.success) {
        matchScore = nlpResponse.data.matchScore;
      }
    } catch (nlpError) {
      console.error('Match score calculation error:', nlpError.message);
      // Continue with default score
    }

    // Add application to job
    const application = {
      candidate: candidate._id,
      appliedDate: new Date(),
      status: 'applied',
      matchScore
    };

    job.applications.push(application);
    job.analytics.applications += 1;
    await job.save();

    // Add application to candidate
    candidate.jobApplications.push({
      job: job._id,
      appliedDate: new Date(),
      status: 'applied',
      matchScore
    });
    await candidate.save();

    res.json({
      message: 'Application submitted successfully',
      matchScore,
      application: {
        jobId: job._id,
        jobTitle: job.title,
        appliedDate: application.appliedDate,
        status: application.status,
        matchScore
      }
    });
  } catch (error) {
    console.error('Apply for job error:', error);
    res.status(500).json({ message: 'Failed to apply for job' });
  }
});

// @route   GET /api/jobs/:id/applications
// @desc    Get job applications
// @access  Private (Company only)
router.get('/:id/applications', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, minScore } = req.query;

    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    const job = await Job.findOne({ _id: req.params.id, company: company._id })
      .populate({
        path: 'applications.candidate',
        select: 'firstName lastName email phone location skills experience education resume'
      });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or access denied' });
    }

    let applications = job.applications;

    // Filter by status
    if (status) {
      applications = applications.filter(app => app.status === status);
    }

    // Filter by minimum score
    if (minScore) {
      applications = applications.filter(app => app.matchScore >= parseInt(minScore));
    }

    // Sort by match score and application date
    applications.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.appliedDate) - new Date(a.appliedDate);
    });

    // Pagination
    const total = applications.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    applications = applications.slice(startIndex, endIndex);

    res.json({
      job: {
        _id: job._id,
        title: job.title,
        status: job.status
      },
      applications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    res.status(500).json({ message: 'Failed to fetch job applications' });
  }
});

module.exports = router;
