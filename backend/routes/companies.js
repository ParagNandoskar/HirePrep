const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { logoUpload, handleUploadError } = require('../middleware/upload');
const Company = require('../models/Company');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');

const router = express.Router();

// @route   GET /api/companies/profile
// @desc    Get company profile
// @access  Private (Company only)
router.get('/profile', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user._id });

    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    res.json(company);
  } catch (error) {
    console.error('Get company profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// @route   PUT /api/companies/profile
// @desc    Update company profile
// @access  Private (Company only)
router.put('/profile', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const {
      companyName,
      industry,
      companySize,
      website,
      description,
      location,
      contactInfo,
      hrContacts,
      benefits,
      culture
    } = req.body;

    const company = await Company.findOneAndUpdate(
      { user: req.user._id },
      {
        companyName,
        industry,
        companySize,
        website,
        description,
        location,
        contactInfo,
        hrContacts,
        benefits,
        culture
      },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      company
    });
  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// @route   POST /api/companies/upload-logo
// @desc    Upload company logo
// @access  Private (Company only)
router.post('/upload-logo',
  authenticateToken,
  authorizeRole('company'),
  logoUpload.single('logo'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No logo file provided' });
      }

      const company = await Company.findOneAndUpdate(
        { user: req.user._id },
        {
          logo: {
            s3Key: req.file.key,
            s3Url: req.file.location,
            uploadDate: new Date()
          }
        },
        { new: true }
      );

      if (!company) {
        return res.status(404).json({ message: 'Company profile not found' });
      }

      res.json({
        message: 'Logo uploaded successfully',
        logo: company.logo
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ message: 'Failed to upload logo' });
    }
  }
);

// @route   GET /api/companies/dashboard
// @desc    Get company dashboard data
// @access  Private (Company only)
router.get('/dashboard', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const company = await Company.findOne({ user: req.user._id });
    
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    // Get company's job statistics
    const jobs = await Job.find({ company: company._id });
    
    const jobStats = {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(job => job.status === 'active').length,
      draftJobs: jobs.filter(job => job.status === 'draft').length,
      closedJobs: jobs.filter(job => job.status === 'closed').length
    };

    // Calculate application statistics
    const allApplications = jobs.reduce((acc, job) => acc + job.applications.length, 0);
    const shortlistedApplications = jobs.reduce((acc, job) => 
      acc + job.applications.filter(app => app.status === 'shortlisted').length, 0
    );
    const hiredApplications = jobs.reduce((acc, job) => 
      acc + job.applications.filter(app => app.status === 'hired').length, 0
    );

    const applicationStats = {
      totalApplications: allApplications,
      shortlisted: shortlistedApplications,
      hired: hiredApplications,
      conversionRate: allApplications > 0 ? ((hiredApplications / allApplications) * 100).toFixed(1) : 0
    };

    // Get recent applications
    const recentJobs = await Job.find({ company: company._id })
      .populate('applications.candidate', 'firstName lastName email resume')
      .sort({ createdAt: -1 })
      .limit(3);

    const recentApplications = [];
    recentJobs.forEach(job => {
      job.applications
        .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
        .slice(0, 5)
        .forEach(app => {
          recentApplications.push({
            jobTitle: job.title,
            candidate: app.candidate,
            appliedDate: app.appliedDate,
            status: app.status,
            matchScore: app.matchScore
          });
        });
    });

    res.json({
      company: {
        companyName: company.companyName,
        industry: company.industry,
        logo: company.logo
      },
      jobStats,
      applicationStats,
      recentApplications: recentApplications.slice(0, 10)
    });
  } catch (error) {
    console.error('Get company dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/companies/candidates
// @desc    Get shortlisted candidates for company's jobs
// @access  Private (Company only)
router.get('/candidates', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, jobId, minScore } = req.query;
    
    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    // Build query for company's jobs
    const jobQuery = { company: company._id };
    if (jobId) jobQuery._id = jobId;

    const jobs = await Job.find(jobQuery);
    const jobIds = jobs.map(job => job._id);

    // Build aggregation pipeline to get candidates
    const matchStage = {
      'jobApplications.job': { $in: jobIds }
    };

    if (status) {
      matchStage['jobApplications.status'] = status;
    }

    if (minScore) {
      matchStage['jobApplications.matchScore'] = { $gte: parseInt(minScore) };
    }

    const candidates = await Candidate.aggregate([
      { $match: matchStage },
      { $unwind: '$jobApplications' },
      { $match: { 'jobApplications.job': { $in: jobIds } } },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobApplications.job',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          phone: 1,
          location: 1,
          skills: 1,
          experience: 1,
          education: 1,
          resume: 1,
          application: '$jobApplications',
          jobTitle: '$job.title'
        }
      },
      { $sort: { 'application.matchScore': -1, 'application.appliedDate': -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    ]);

    // Get total count for pagination
    const totalCandidates = await Candidate.aggregate([
      { $match: matchStage },
      { $unwind: '$jobApplications' },
      { $match: { 'jobApplications.job': { $in: jobIds } } },
      { $count: 'total' }
    ]);

    const total = totalCandidates[0]?.total || 0;

    res.json({
      candidates,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get company candidates error:', error);
    res.status(500).json({ message: 'Failed to fetch candidates' });
  }
});

// @route   PUT /api/companies/candidates/:candidateId/status
// @desc    Update candidate application status
// @access  Private (Company only)
router.put('/candidates/:candidateId/status', authenticateToken, authorizeRole('company'), async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { jobId, status, notes } = req.body;

    const company = await Company.findOne({ user: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company profile not found' });
    }

    // Verify job belongs to company
    const job = await Job.findOne({ _id: jobId, company: company._id });
    if (!job) {
      return res.status(404).json({ message: 'Job not found or access denied' });
    }

    // Update application status in job
    const applicationIndex = job.applications.findIndex(
      app => app.candidate.toString() === candidateId
    );

    if (applicationIndex === -1) {
      return res.status(404).json({ message: 'Application not found' });
    }

    job.applications[applicationIndex].status = status;
    job.applications[applicationIndex].notes = notes;
    job.applications[applicationIndex].reviewedBy = req.user._id;
    job.applications[applicationIndex].reviewDate = new Date();

    await job.save();

    // Update application status in candidate
    await Candidate.updateOne(
      { 
        _id: candidateId,
        'jobApplications.job': jobId 
      },
      {
        $set: {
          'jobApplications.$.status': status,
          'jobApplications.$.notes': notes
        }
      }
    );

    res.json({
      message: 'Application status updated successfully',
      application: job.applications[applicationIndex]
    });
  } catch (error) {
    console.error('Update candidate status error:', error);
    res.status(500).json({ message: 'Failed to update application status' });
  }
});

module.exports = router;
