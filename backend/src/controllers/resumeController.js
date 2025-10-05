const Resume = require('../models/Resume');
const cloudinary = require('../config/cloudinary');
const resumeParserService = require('../services/resumeParser');
const { successResponse, errorResponse, getFileExtension } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Upload and parse resume
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'No file uploaded', 400);
  }

  const userId = req.user.id;
  const file = req.file;
  const fileExtension = getFileExtension(file.originalname).replace('.', '');

  try {
    // Upload file to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: `resumes/${userId}/${Date.now()}_${file.originalname}`,
          format: fileExtension
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(file.buffer);
    });

    // UPDATED: Use new Python NLP service integration
    // Save file temporarily for Python service (if needed)
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `${Date.now()}_${file.originalname}`);
    fs.writeFileSync(tempFilePath, file.buffer);

    try {
      // Parse resume using new integrated method (calls Python NLP service + generates embeddings)
      const parsedData = await resumeParserService.parseResume(tempFilePath, file.buffer, fileExtension);

      // Analyze resume quality using Gemini (retained)
      const aiAnalysis = await resumeParserService.analyzeResumeQuality(parsedData);

      // Check if user already has a resume and update or create new
      let resume = await Resume.findOne({ userId });

      if (resume) {
        // Update existing resume
        resume.originalFileName = file.originalname;
        resume.fileUrl = uploadResult.secure_url;
        resume.fileType = fileExtension;
        resume.parsedData = parsedData;
        resume.embedding = parsedData.embeddings; // UPDATED: Extract embeddings from parsedData
        resume.aiAnalysis = aiAnalysis;
        resume.isProcessed = true;
        await resume.save();
      } else {
        // Create new resume
        resume = new Resume({
          userId,
          originalFileName: file.originalname,
          fileUrl: uploadResult.secure_url,
          fileType: fileExtension,
          parsedData,
          embedding: parsedData.embeddings, // UPDATED: Extract embeddings from parsedData
          aiAnalysis,
          isProcessed: true
        });
        await resume.save();
      }

      return successResponse(res, {
        resume: {
          id: resume._id,
          originalFileName: resume.originalFileName,
          fileUrl: resume.fileUrl,
          fileType: resume.fileType,
          parsedData: resume.parsedData,
          aiAnalysis: resume.aiAnalysis,
          isProcessed: resume.isProcessed,
          createdAt: resume.createdAt,
          updatedAt: resume.updatedAt
        }
      }, 'Resume uploaded and processed successfully', 201);

    } catch (parseError) {
      console.error('Resume parsing error:', parseError);
      return errorResponse(res, 'Failed to process resume: ' + parseError.message, 500);
    } finally {
      // Clean up temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

  } catch (error) {
    console.error('Resume upload error:', error);
    return errorResponse(res, 'Failed to upload resume: ' + error.message, 500);
  }
});

// Get user's resume
const getResume = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  // Check if user is accessing their own resume or if they're authorized
  if (req.user.id !== userId && req.user.role !== 'company') {
    return errorResponse(res, 'Access denied', 403);
  }

  const resume = await Resume.findOne({ userId }).populate('userId', 'name email profile');

  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  return successResponse(res, {
    resume: {
      id: resume._id,
      user: resume.userId,
      originalFileName: resume.originalFileName,
      fileUrl: resume.fileUrl,
      fileType: resume.fileType,
      parsedData: resume.parsedData,
      aiAnalysis: resume.aiAnalysis,
      isProcessed: resume.isProcessed,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    }
  }, 'Resume retrieved successfully');
});

// Get current user's resume
const getMyResume = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const resume = await Resume.findOne({ userId });

  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  return successResponse(res, {
    resume: {
      id: resume._id,
      originalFileName: resume.originalFileName,
      fileUrl: resume.fileUrl,
      fileType: resume.fileType,
      parsedData: resume.parsedData,
      aiAnalysis: resume.aiAnalysis,
      isProcessed: resume.isProcessed,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt
    }
  }, 'Resume retrieved successfully');
});

// Update parsed resume data manually
const updateResumeData = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { parsedData } = req.body;

  if (!parsedData) {
    return errorResponse(res, 'Parsed data is required', 400);
  }

  const resume = await Resume.findOne({ userId });

  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  // Update parsed data
  resume.parsedData = { ...resume.parsedData, ...parsedData };
  
  // Regenerate embeddings with updated data
  try {
    resume.embedding = await resumeParserService.generateResumeEmbeddings(resume.parsedData);
    
    // Reanalyze resume quality
    resume.aiAnalysis = await resumeParserService.analyzeResumeQuality(resume.parsedData);
    
    await resume.save();
  } catch (error) {
    console.error('Resume update error:', error);
    // Continue with the update even if AI processing fails
    await resume.save();
  }

  return successResponse(res, {
    resume: {
      id: resume._id,
      parsedData: resume.parsedData,
      aiAnalysis: resume.aiAnalysis,
      updatedAt: resume.updatedAt
    }
  }, 'Resume data updated successfully');
});

// Delete resume
const deleteResume = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const resume = await Resume.findOne({ userId });

  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  try {
    // Delete file from Cloudinary
    if (resume.fileUrl) {
      const publicId = resume.fileUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`resumes/${userId}/${publicId}`, { resource_type: 'raw' });
    }

    // Delete resume from database
    await Resume.findByIdAndDelete(resume._id);

    return successResponse(res, null, 'Resume deleted successfully');
  } catch (error) {
    console.error('Resume deletion error:', error);
    return errorResponse(res, 'Failed to delete resume', 500);
  }
});

// Analyze resume against specific job
const analyzeResumeForJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  const Job = require('../models/Job');
  const jobMatcherService = require('../services/jobMatcher');

  // Get resume and job
  const [resume, job] = await Promise.all([
    Resume.findOne({ userId, isProcessed: true }),
    Job.findById(jobId)
  ]);

  if (!resume) {
    return errorResponse(res, 'Resume not found or not processed', 404);
  }

  if (!job) {
    return errorResponse(res, 'Job not found', 404);
  }

  try {
    // Calculate match score
    const matchScore = await jobMatcherService.calculateJobMatchScore(resume, job);
    
    // Get skill gap analysis
    const skillGapAnalysis = jobMatcherService.getSkillGapAnalysis(
      resume.parsedData.skills,
      job.requirements.skills
    );

    // Generate improvement suggestions
    const suggestions = jobMatcherService.generateImprovementSuggestions(
      resume,
      job,
      matchScore
    );

    return successResponse(res, {
      jobId: job._id,
      jobTitle: job.title,
      matchScore,
      skillGapAnalysis,
      suggestions,
      analysis: {
        resumeStrengths: resume.aiAnalysis?.strengths || [],
        resumeImprovements: resume.aiAnalysis?.improvements || [],
        overallResumeScore: resume.aiAnalysis?.overallScore || 0
      }
    }, 'Resume analysis for job completed');

  } catch (error) {
    console.error('Resume analysis error:', error);
    return errorResponse(res, 'Failed to analyze resume for job', 500);
  }
});

// Get resume analytics/statistics
const getResumeAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const resume = await Resume.findOne({ userId });

  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  // Calculate analytics
  const analytics = {
    overallScore: resume.aiAnalysis?.overallScore || 0,
    skillsCount: resume.parsedData?.skills?.length || 0,
    experienceYears: 0,
    educationCount: resume.parsedData?.education?.length || 0,
    projectsCount: resume.parsedData?.projects?.length || 0,
    certificationsCount: resume.parsedData?.certifications?.length || 0,
    languagesCount: resume.parsedData?.languages?.length || 0,
    lastUpdated: resume.updatedAt,
    skillsBreakdown: {
      technical: 0,
      soft: 0,
      language: 0,
      other: 0
    }
  };

  // Calculate experience years
  if (resume.parsedData?.experience) {
    analytics.experienceYears = resume.parsedData.experience.reduce((total, exp) => {
      const startYear = exp.startDate ? new Date(exp.startDate).getFullYear() : 0;
      const endYear = exp.endDate && exp.endDate !== 'Present' 
        ? new Date(exp.endDate).getFullYear() 
        : new Date().getFullYear();
      return total + Math.max(0, endYear - startYear);
    }, 0);
  }

  // Calculate skills breakdown
  if (resume.parsedData?.skills) {
    resume.parsedData.skills.forEach(skill => {
      const category = skill.category || 'other';
      if (analytics.skillsBreakdown[category] !== undefined) {
        analytics.skillsBreakdown[category]++;
      } else {
        analytics.skillsBreakdown.other++;
      }
    });
  }

  return successResponse(res, {
    analytics,
    strengths: resume.aiAnalysis?.strengths || [],
    improvements: resume.aiAnalysis?.improvements || [],
    careerSuggestions: resume.aiAnalysis?.careerSuggestions || []
  }, 'Resume analytics retrieved successfully');
});

module.exports = {
  uploadResume,
  getResume,
  getMyResume,
  updateResumeData,
  deleteResume,
  analyzeResumeForJob,
  getResumeAnalytics
};
