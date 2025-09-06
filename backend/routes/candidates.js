const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { resumeUpload, handleUploadError } = require('../middleware/upload');
const Candidate = require('../models/Candidate');
const axios = require('axios');

const router = express.Router();

// @route   GET /api/candidates/profile
// @desc    Get candidate profile
// @access  Private (Candidate only)
router.get('/profile', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate('jobApplications.job', 'title company location')
      .populate({
        path: 'jobApplications.job',
        populate: {
          path: 'company',
          select: 'companyName logo'
        }
      });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json(candidate);
  } catch (error) {
    console.error('Get candidate profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// @route   PUT /api/candidates/profile
// @desc    Update candidate profile
// @access  Private (Candidate only)
router.put('/profile', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      location,
      profileSummary,
      skills,
      education,
      experience,
      certifications,
      preferences
    } = req.body;

    const candidate = await Candidate.findOneAndUpdate(
      { user: req.user._id },
      {
        firstName,
        lastName,
        phone,
        location,
        profileSummary,
        skills,
        education,
        experience,
        certifications,
        preferences
      },
      { new: true, runValidators: true }
    );

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      candidate
    });
  } catch (error) {
    console.error('Update candidate profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// @route   POST /api/candidates/upload-resume
// @desc    Upload and process resume
// @access  Private (Candidate only)
router.post('/upload-resume', 
  authenticateToken, 
  authorizeRole('candidate'),
  resumeUpload.single('resume'),
  handleUploadError,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No resume file provided' });
      }

      const candidate = await Candidate.findOne({ user: req.user._id });
      if (!candidate) {
        return res.status(404).json({ message: 'Candidate profile not found' });
      }

      // Update resume info in database
      candidate.resume = {
        originalName: req.file.originalname,
        s3Key: req.file.key,
        s3Url: req.file.location,
        uploadDate: new Date(),
        fileSize: req.file.size,
        contentType: req.file.contentType
      };

      await candidate.save();

      // Send file to NLP service for processing
      try {
        const nlpResponse = await axios.post(`${process.env.NLP_SERVICE_URL}/parse-resume`, {
          resumeUrl: req.file.location,
          candidateId: candidate._id.toString()
        }, {
          timeout: 30000 // 30 seconds timeout
        });

        if (nlpResponse.data.success) {
          // Update candidate with extracted data
          candidate.resume.extractedData = nlpResponse.data.extractedData;
          candidate.resume.nlpScore = nlpResponse.data.score;
          candidate.resume.lastAnalyzed = new Date();
          
          // Update skills if extracted
          if (nlpResponse.data.extractedData.skills && nlpResponse.data.extractedData.skills.length > 0) {
            const extractedSkills = nlpResponse.data.extractedData.skills.map(skill => ({
              name: skill,
              level: 'Intermediate', // Default level
              yearsOfExperience: 0
            }));
            
            // Merge with existing skills
            const existingSkillNames = candidate.skills.map(s => s.name.toLowerCase());
            const newSkills = extractedSkills.filter(s => 
              !existingSkillNames.includes(s.name.toLowerCase())
            );
            
            candidate.skills = [...candidate.skills, ...newSkills];
          }

          await candidate.save();
        }
      } catch (nlpError) {
        console.error('NLP service error:', nlpError.message);
        // Continue without NLP processing - file is still uploaded
      }

      res.json({
        message: 'Resume uploaded successfully',
        resume: candidate.resume,
        extractedData: candidate.resume.extractedData || null
      });

    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({ message: 'Failed to upload resume' });
    }
  }
);

// @route   GET /api/candidates/resume-analysis
// @desc    Get resume analysis results
// @access  Private (Candidate only)
router.get('/resume-analysis', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ user: req.user._id });
    
    if (!candidate || !candidate.resume || !candidate.resume.extractedData) {
      return res.status(404).json({ message: 'No resume analysis found' });
    }

    res.json({
      resumeInfo: {
        originalName: candidate.resume.originalName,
        uploadDate: candidate.resume.uploadDate,
        lastAnalyzed: candidate.resume.lastAnalyzed,
        nlpScore: candidate.resume.nlpScore
      },
      extractedData: candidate.resume.extractedData,
      suggestions: generateResumeSuggestions(candidate.resume.extractedData)
    });
  } catch (error) {
    console.error('Get resume analysis error:', error);
    res.status(500).json({ message: 'Failed to fetch resume analysis' });
  }
});

// @route   GET /api/candidates/dashboard
// @desc    Get candidate dashboard data
// @access  Private (Candidate only)
router.get('/dashboard', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate({
        path: 'jobApplications.job',
        populate: {
          path: 'company',
          select: 'companyName logo location'
        }
      });

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    const stats = {
      totalApplications: candidate.jobApplications.length,
      shortlisted: candidate.jobApplications.filter(app => app.status === 'shortlisted').length,
      interviews: candidate.jobApplications.filter(app => app.status === 'interview').length,
      hired: candidate.jobApplications.filter(app => app.status === 'hired').length,
      rejected: candidate.jobApplications.filter(app => app.status === 'rejected').length
    };

    const recentApplications = candidate.jobApplications
      .sort((a, b) => new Date(b.appliedDate) - new Date(a.appliedDate))
      .slice(0, 5);

    res.json({
      profile: {
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        profileSummary: candidate.profileSummary,
        skills: candidate.skills,
        resume: candidate.resume ? {
          hasResume: true,
          nlpScore: candidate.resume.nlpScore,
          lastAnalyzed: candidate.resume.lastAnalyzed
        } : { hasResume: false }
      },
      stats,
      recentApplications
    });
  } catch (error) {
    console.error('Get candidate dashboard error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/candidates/applications
// @desc    Get candidate's job applications
// @access  Private (Candidate only)
router.get('/applications', authenticateToken, authorizeRole('candidate'), async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ user: req.user._id })
      .populate({
        path: 'jobApplications.job',
        select: 'title company location status',
        populate: {
          path: 'company',
          select: 'companyName logo'
        }
      });

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate profile not found' });
    }

    const applications = candidate.jobApplications.map(app => ({
      _id: app._id,
      job: app.job,
      status: app.status,
      appliedDate: app.appliedDate,
      lastUpdated: app.lastUpdated
    }));

    res.json({
      success: true,
      applications: applications
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

// Helper function to generate resume suggestions
function generateResumeSuggestions(extractedData) {
  const suggestions = [];

  if (!extractedData.skills || extractedData.skills.length < 5) {
    suggestions.push({
      type: 'skills',
      message: 'Consider adding more technical skills to improve your profile visibility'
    });
  }

  if (!extractedData.certifications || extractedData.certifications.length === 0) {
    suggestions.push({
      type: 'certifications',
      message: 'Adding relevant certifications can significantly boost your profile score'
    });
  }

  if (!extractedData.summary || extractedData.summary.length < 100) {
    suggestions.push({
      type: 'summary',
      message: 'A comprehensive professional summary can improve your profile appeal'
    });
  }

  return suggestions;
}

module.exports = router;
