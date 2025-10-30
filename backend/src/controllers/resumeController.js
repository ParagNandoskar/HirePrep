const Resume = require('../models/Resume');
const { s3Client, deleteFromS3, getS3FileUrl, getSignedFileUrl, extractFileKeyFromUrl } = require('../config/aws');
const resumeParserService = require('../services/resumeParser');
const { successResponse, errorResponse, getFileExtension } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const fs = require('fs').promises; // Use promises version for async/await
const path = require('path');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Upload and parse resume
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    return errorResponse(res, 'No file uploaded', 400);
  }

  const userId = req.user.id;
  const file = req.file;
  const fileExtension = getFileExtension(file.originalname).replace('.', '');
  let tempFilePath = null;

  try {
    // File is already uploaded to S3 via our custom multer storage
    // Get the file URL and key from our custom storage response
    const fileUrl = file.location; // Our custom storage provides this
    const fileKey = file.key; // S3 object key

    // Generate pre-signed URL for secure access by Python service (6 minutes expiration)
    const secureUrl = await getSignedFileUrl(fileKey, 360);

    // Since we're using custom S3 storage, we need to download the file for local processing
    // The file is already uploaded to S3, but we need the content for parsing
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    
    // Download file from S3 using AWS SDK
    const getObjectCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    const s3Response = await s3Client.send(getObjectCommand);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of s3Response.Body) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    
    // Create temporary file for processing
    const tempDir = path.join(__dirname, '../../temp');
    const fsSync = require('fs'); // Keep sync version for directory creation
    if (!fsSync.existsSync(tempDir)) {
      fsSync.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `${Date.now()}_${file.originalname}`);
    await fs.writeFile(tempFilePath, fileBuffer);

    // Parse resume - try Python service first with secure URL, then fallback to local processing
    let parsedData = null;
    let aiAnalysis = null;
    
    try {
      // Use secure pre-signed URL for Python service
      parsedData = await resumeParserService.parseResume(tempFilePath, fileBuffer, fileExtension, secureUrl, userId);
      
      // --- START: Schema Mismatch Fix ---
      if (parsedData && parsedData.skills && Array.isArray(parsedData.skills)) {
        // Check if the first element is a string, confirming the incorrect format
        if (parsedData.skills.length > 0 && typeof parsedData.skills[0] === 'string') {
          console.log("Transforming skills data to match Mongoose schema...");
          
          // Map the array of strings to the required array of objects
          parsedData.skills = parsedData.skills.map(skillName => {
            // Determine category based on skill name (basic categorization)
            let category = 'technical'; // default
            const softSkills = ['communication', 'leadership', 'teamwork', 'problem solving', 'time management'];
            const languages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'hindi'];
            
            const skillLower = skillName.toLowerCase();
            if (softSkills.some(soft => skillLower.includes(soft))) {
              category = 'soft';
            } else if (languages.some(lang => skillLower.includes(lang))) {
              category = 'language';
            }
            
            return {
              name: skillName,
              category: category,
              proficiency: 'intermediate' // Default proficiency level
            };
          });
        }
      }
      
      // --- START: Skill Deduplication Fix ---
      if (parsedData && parsedData.skills && Array.isArray(parsedData.skills)) {
        // Define common mapping for standardization
        const skillMap = {
          'Mysql': 'MySQL',
          'Mongodb': 'MongoDB',
          'Css': 'CSS',
          'Html': 'HTML',
          'Javascript': 'JavaScript',
          'Node': 'Node.js', // Standardize 'Node' to 'Node.js'
          'Reactjs': 'React',
          'Nodejs': 'Node.js',
          'Expressjs': 'Express',
          'Js': 'JavaScript',
          'Ts': 'TypeScript',
          'Postgresql': 'PostgreSQL',
          'Github': 'GitHub',
          'Gitlab': 'GitLab',
          'Aws': 'AWS',
          'Api': 'API',
          'Ui': 'UI',
          'Ux': 'UX'
        };

        const seenSkills = new Map();
        
        parsedData.skills.forEach(skillObj => {
          // Use the mapped name or original name, and force Title Case for consistency
          let standardizedName = (skillMap[skillObj.name] || skillObj.name).trim();

          // Check for case-insensitive duplicates (e.g., 'CSS' vs 'Css')
          const key = standardizedName.toLowerCase();
          
          if (!seenSkills.has(key)) {
            // Store the skill object under the standardized name/key
            seenSkills.set(key, { ...skillObj, name: standardizedName });
          }
        });

        // Replace the original array with the deduplicated, standardized list
        parsedData.skills = Array.from(seenSkills.values());
      }
      // --- END: Skill Deduplication Fix ---
      
      // Handle other potential data format mismatches
      if (parsedData && parsedData.education && Array.isArray(parsedData.education)) {
        parsedData.education = parsedData.education.map(edu => {
          if (typeof edu === 'string') {
            return {
              institution: edu,
              degree: '',
              field: '',
              startDate: '',
              endDate: '',
              gpa: '',
              achievements: []
            };
          }
          return edu;
        });
      }
      
      if (parsedData && parsedData.experience && Array.isArray(parsedData.experience)) {
        parsedData.experience = parsedData.experience.map(exp => {
          if (typeof exp === 'string') {
            return {
              company: '',
              position: exp,
              location: '',
              startDate: '',
              endDate: '',
              description: '',
              achievements: [],
              skills: []
            };
          }
          return exp;
        });
      }
      
      if (parsedData && parsedData.languages && Array.isArray(parsedData.languages)) {
        parsedData.languages = parsedData.languages.map(lang => {
          if (typeof lang === 'string') {
            return {
              name: lang,
              proficiency: 'intermediate'
            };
          }
          return lang;
        });
      }
      // --- END: Schema Mismatch Fix ---
      
      // Analyze resume quality using Gemini (retained)
      aiAnalysis = await resumeParserService.analyzeResumeQuality(parsedData);
    } catch (parseError) {
      console.error('Resume parsing failed, but continuing with file upload:', parseError.message);
      // Create minimal parsed data structure
      parsedData = {
        personalInfo: { name: null, email: null, phone: null },
        summary: null,
        skills: [],
        education: [],
        experience: [],
        projects: [],
        certifications: [],
        languages: [],
        embeddings: []
      };
      aiAnalysis = {
        overallScore: 0,
        strengths: [],
        improvements: ['Resume parsing failed - please upload a different format or contact support'],
        careerSuggestions: []
      };
    }

    // Check if user already has a resume and update or create new
    let resume = await Resume.findOne({ userId });

    if (resume) {
      // Delete old file from S3 if it exists
      if (resume.fileKey) {
        try {
          await deleteFromS3(resume.fileKey);
        } catch (deleteError) {
          console.warn('Failed to delete old resume file:', deleteError.message);
        }
      } else if (resume.fileUrl) {
        // Extract file key from URL (fallback for old records)
        const oldFileKey = extractFileKeyFromUrl(resume.fileUrl);
        if (oldFileKey) {
          try {
            await deleteFromS3(oldFileKey);
          } catch (deleteError) {
            console.warn('Failed to delete old resume file:', deleteError.message);
          }
        }
      }

      // Update existing resume
      resume.originalFileName = file.originalname;
      resume.fileUrl = fileUrl;
      resume.fileKey = fileKey; // Store S3 key for deletion
      resume.fileType = fileExtension;
      resume.parsedData = parsedData;
      resume.embedding = parsedData.embeddings; // Extract embeddings from parsedData
      resume.aiAnalysis = aiAnalysis;
      resume.isProcessed = true;
      await resume.save();
    } else {
      // Create new resume
      resume = new Resume({
        userId,
        originalFileName: file.originalname,
        fileUrl,
        fileKey, // Store S3 key for deletion
        fileType: fileExtension,
        parsedData,
        embedding: parsedData.embeddings, // Extract embeddings from parsedData
        aiAnalysis,
        isProcessed: true
      });
      await resume.save();
    }

    // Auto-add extracted skills to user's candidate profile
    try {
      if (parsedData && parsedData.skills && parsedData.skills.length > 0) {
        const Candidate = require('../models/Candidate');
        let candidate = await Candidate.findOne({ userId });
        
        if (!candidate) {
          // Create new candidate profile if it doesn't exist
          const User = require('../models/User');
          const user = await User.findById(userId);
          
          if (user) {
            candidate = new Candidate({
              userId: userId,
              firstName: user.name?.split(' ')[0] || '',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              email: user.email,
              skills: [],
              education: [],
              experience: [],
              projects: [],
              certifications: [],
              languages: []
            });
            
            try {
              await candidate.save();
              console.log(`Created new candidate profile for user ${userId}`);
            } catch (createError) {
              if (createError.code === 11000) {
                // If duplicate key error, try to find existing candidate again
                candidate = await Candidate.findOne({ userId });
                if (!candidate) {
                  console.error('Could not create or find candidate profile:', createError);
                  return; // Skip skill update but don't fail the resume upload
                }
              } else {
                throw createError;
              }
            }
          }
        }
        
        if (candidate) {
          // Get current candidate skills or initialize empty array
          const currentSkills = candidate.skills || [];
          const currentSkillNames = currentSkills.map(skill => skill.name.toLowerCase());
          
          // Add new skills that don't already exist in candidate's profile
          const newSkills = parsedData.skills
            .filter(resumeSkill => !currentSkillNames.includes(resumeSkill.name.toLowerCase()))
            .map(resumeSkill => ({
              name: resumeSkill.name,
              level: resumeSkill.proficiency === 'beginner' ? 'Beginner' :
                     resumeSkill.proficiency === 'intermediate' ? 'Intermediate' :
                     resumeSkill.proficiency === 'advanced' ? 'Advanced' :
                     resumeSkill.proficiency === 'expert' ? 'Expert' : 'Intermediate',
              yearsOfExperience: 0,
              source: 'resume-extracted',
              addedAt: new Date()
            }));
          
          if (newSkills.length > 0) {
            console.log(`Adding ${newSkills.length} new skills to candidate profile:`, newSkills.map(s => s.name).join(', '));
            
            // Add new skills to candidate's profile
            candidate.skills.push(...newSkills);
            await candidate.save();
            
            console.log(`Successfully added ${newSkills.length} skills to candidate ${userId} profile`);
          } else {
            console.log('No new skills to add - all extracted skills already exist in candidate profile');
          }
        } else {
          console.log('Candidate profile not found for user:', userId);
        }
      }
    } catch (skillUpdateError) {
      console.error('Error updating candidate skills from resume:', skillUpdateError);
      // Don't fail the upload if skill update fails
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

  } catch (error) {
    console.error('Resume upload error:', error);
    
    // Delete uploaded file from S3 since processing failed
    if (file && file.key) {
      try {
        await deleteFromS3(file.key);
      } catch (deleteError) {
        console.warn('Failed to cleanup uploaded file after error:', deleteError.message);
      }
    }
    
    return errorResponse(res, 'Failed to upload resume: ' + error.message, 500);
  } finally {
    // GUARANTEED CLEANUP: Always delete temporary file if it was created
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
        console.log(`Temp file deleted: ${tempFilePath}`);
      } catch (unlinkError) {
        console.warn('Failed to cleanup temp file:', unlinkError.message);
      }
    }
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
  const updatedParsedData = { ...resume.parsedData, ...parsedData };
  
  // --- START: Schema Mismatch Fix for Manual Updates ---
  if (updatedParsedData.skills && Array.isArray(updatedParsedData.skills)) {
    // Check if any element is a string, confirming the incorrect format
    if (updatedParsedData.skills.some(skill => typeof skill === 'string')) {
      console.log("Transforming skills data in manual update to match Mongoose schema...");
      
      updatedParsedData.skills = updatedParsedData.skills.map(skill => {
        if (typeof skill === 'string') {
          // Determine category based on skill name
          let category = 'technical'; // default
          const softSkills = ['communication', 'leadership', 'teamwork', 'problem solving', 'time management'];
          const languages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'hindi'];
          
          const skillLower = skill.toLowerCase();
          if (softSkills.some(soft => skillLower.includes(soft))) {
            category = 'soft';
          } else if (languages.some(lang => skillLower.includes(lang))) {
            category = 'language';
          }
          
          return {
            name: skill,
            category: category,
            proficiency: 'intermediate'
          };
        }
        return skill; // Already in correct format
      });
    }
    
    // --- START: Skill Deduplication Fix for Manual Updates ---
    // Define common mapping for standardization
    const skillMap = {
      'Mysql': 'MySQL',
      'Mongodb': 'MongoDB',
      'Css': 'CSS',
      'Html': 'HTML',
      'Javascript': 'JavaScript',
      'Node': 'Node.js', // Standardize 'Node' to 'Node.js'
      'Reactjs': 'React',
      'Nodejs': 'Node.js',
      'Expressjs': 'Express',
      'Js': 'JavaScript',
      'Ts': 'TypeScript',
      'Postgresql': 'PostgreSQL',
      'Github': 'GitHub',
      'Gitlab': 'GitLab',
      'Aws': 'AWS',
      'Api': 'API',
      'Ui': 'UI',
      'Ux': 'UX'
    };

    const seenSkills = new Map();
    
    updatedParsedData.skills.forEach(skillObj => {
      // Use the mapped name or original name, and force Title Case for consistency
      let standardizedName = (skillMap[skillObj.name] || skillObj.name).trim();

      // Check for case-insensitive duplicates (e.g., 'CSS' vs 'Css')
      const key = standardizedName.toLowerCase();
      
      if (!seenSkills.has(key)) {
        // Store the skill object under the standardized name/key
        seenSkills.set(key, { ...skillObj, name: standardizedName });
      }
    });

    // Replace the original array with the deduplicated, standardized list
    updatedParsedData.skills = Array.from(seenSkills.values());
    // --- END: Skill Deduplication Fix for Manual Updates ---
  }
  // --- END: Schema Mismatch Fix for Manual Updates ---
  
  resume.parsedData = updatedParsedData;
  
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
    // Delete file from S3
    if (resume.fileKey) {
      // Use stored file key
      await deleteFromS3(resume.fileKey);
    } else if (resume.fileUrl) {
      // Extract file key from URL (fallback for old records)
      const fileKey = extractFileKeyFromUrl(resume.fileUrl);
      if (fileKey) {
        await deleteFromS3(fileKey);
      }
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

// Get secure signed URL for resume file access
const getResumeSignedUrl = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { expiresIn = 3600 } = req.query; // Default 1 hour expiration
  
  // Check if user is accessing their own resume or if they're authorized (company)
  if (req.user.id !== userId && req.user.role !== 'company') {
    return errorResponse(res, 'Access denied', 403);
  }

  const resume = await Resume.findOne({ userId });

  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  if (!resume.fileKey) {
    return errorResponse(res, 'Resume file key not found', 404);
  }

  try {
    // Generate signed URL for secure access
    const signedUrl = await getSignedFileUrl(resume.fileKey, parseInt(expiresIn));
    
    return successResponse(res, {
      signedUrl,
      fileName: resume.originalFileName,
      fileType: resume.fileType,
      expiresIn: parseInt(expiresIn),
      expiresAt: new Date(Date.now() + parseInt(expiresIn) * 1000).toISOString()
    }, 'Signed URL generated successfully');
  } catch (error) {
    console.error('Signed URL generation error:', error);
    return errorResponse(res, 'Failed to generate signed URL: ' + error.message, 500);
  }
});

// Get all resumes (frontend expects this endpoint)
const getResumes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  console.log('🔍 getResumes called for user:', userId);
  
  const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
  
  console.log('📄 Found resumes in database:', resumes.length);
  if (resumes.length > 0) {
    console.log('📄 First resume details:', {
      id: resumes[0]._id,
      originalFileName: resumes[0].originalFileName,
      isProcessed: resumes[0].isProcessed,
      createdAt: resumes[0].createdAt
    });
  }
  
  // Map resume data to match frontend expectations exactly
  const mappedResumes = resumes.map(resume => ({
    _id: resume._id,
    filename: resume.originalFileName, // Frontend expects 'filename'
    originalName: resume.originalFileName, // Fallback field
    uploadDate: resume.createdAt, // Frontend expects 'uploadDate'
    lastAnalyzed: resume.isProcessed ? resume.updatedAt : null, // Frontend checks this for "Skills Extracted" status
    extractedData: resume.parsedData, // Frontend expects 'extractedData' instead of 'parsedData'
    isProcessed: resume.isProcessed,
    fileUrl: resume.fileUrl,
    fileKey: resume.fileKey,
    fileType: resume.fileType,
    aiAnalysis: resume.aiAnalysis,
    nlpScore: resume.aiAnalysis?.overallScore || 0, // Frontend expects 'nlpScore'
    size: null // We don't store file size, but frontend handles null gracefully
  }));
  
  console.log('✅ Sending mapped resumes to frontend:', mappedResumes.length);
  if (mappedResumes.length > 0) {
    console.log('📄 Sample resume object:', JSON.stringify(mappedResumes[0], null, 2));
  }
  
  return successResponse(res, { resumes: mappedResumes }, 'Resumes retrieved successfully');
});

// Transfer skills from resume to candidate profile (manual trigger)
const syncSkillsToProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  console.log('🔄 Syncing skills and profile data to profile for user:', userId);
  
  // Find the most recent resume
  const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 });
  
  if (!resume) {
    return errorResponse(res, 'No resume found', 404);
  }
  
  console.log('📄 Found resume with skills:', resume.parsedData?.skills?.length || 0);
  console.log('📄 Resume personal info:', resume.parsedData?.personalInfo);
  
  // Find or create candidate profile
  const Candidate = require('../models/Candidate');
  let candidate = await Candidate.findOne({ userId });
  
  if (!candidate) {
    const User = require('../models/User');
    const user = await User.findById(userId);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    candidate = new Candidate({
      userId: userId,
      firstName: user.name?.split(' ')[0] || '',
      lastName: user.name?.split(' ').slice(1).join(' ') || '',
      email: user.email,
      skills: [],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      languages: []
    });
    
    await candidate.save();
    console.log('✅ Created new candidate profile');
  }
  
  // Update phone number from resume if available and not already set
  let phoneUpdated = false;
  if (resume.parsedData?.personalInfo?.phone && (!candidate.phone || candidate.phone.trim() === '')) {
    candidate.phone = resume.parsedData.personalInfo.phone.trim();
    phoneUpdated = true;
    console.log('📞 Updated phone number from resume:', candidate.phone);
  }
  
  // Handle skills sync
  let skillsAdded = 0;
  if (resume.parsedData?.skills && resume.parsedData.skills.length > 0) {
    // Get current candidate skills
    const currentSkills = candidate.skills || [];
    const currentSkillNames = currentSkills.map(skill => skill.name.toLowerCase());
    
    // Add new skills from resume
    const resumeSkills = resume.parsedData.skills;
    const newSkills = resumeSkills
      .filter(resumeSkill => !currentSkillNames.includes(resumeSkill.name.toLowerCase()))
      .map(resumeSkill => ({
        name: resumeSkill.name,
        level: resumeSkill.proficiency === 'beginner' ? 'Beginner' :
               resumeSkill.proficiency === 'intermediate' ? 'Intermediate' :
               resumeSkill.proficiency === 'advanced' ? 'Advanced' :
               resumeSkill.proficiency === 'expert' ? 'Expert' : 'Intermediate',
        yearsOfExperience: 0,
        source: 'resume-extracted',
        addedAt: new Date()
      }));
    
    if (newSkills.length > 0) {
      console.log('🔄 Adding skills:', newSkills.map(s => s.name).join(', '));
      candidate.skills.push(...newSkills);
      skillsAdded = newSkills.length;
    } else {
      console.log('ℹ️ No new skills to add');
    }
  }
  
  // Save the candidate with updated data
  await candidate.save();
  
  if (skillsAdded > 0 || phoneUpdated) {
    console.log('✅ Successfully synced profile data');
    return successResponse(res, { 
      skillsAdded: skillsAdded,
      skills: skillsAdded > 0 ? candidate.skills.filter(s => s.source === 'resume-extracted').map(s => s.name) : [],
      phoneUpdated: phoneUpdated
    }, `Successfully synced profile data - ${skillsAdded} skills added${phoneUpdated ? ', phone updated' : ''}`);
  } else {
    console.log('ℹ️ No new data to sync');
    return successResponse(res, { 
      skillsAdded: 0,
      skills: [],
      phoneUpdated: false
    }, 'No new data to sync - profile already up to date');
  }
});

// View resume by ID (frontend expects this endpoint)
const viewResume = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const resume = await Resume.findById(id).populate('userId', 'name email');
  
  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  // Check permissions
  if (req.user.role === 'student' && req.user.id !== resume.userId._id.toString()) {
    return errorResponse(res, 'Access denied', 403);
  }

  return successResponse(res, resume, 'Resume retrieved successfully');
});

// Download resume by candidate ID (frontend expects this endpoint)
const downloadResume = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  
  const resume = await Resume.findOne({ userId: candidateId, isProcessed: true });
  
  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  if (!resume.fileKey) {
    return errorResponse(res, 'Resume file not available', 404);
  }

  try {
    // Generate signed URL for download
    const signedUrl = await getSignedFileUrl(resume.fileKey, 300); // 5 minutes
    
    return successResponse(res, {
      downloadUrl: signedUrl,
      fileName: resume.originalFileName || 'resume.pdf'
    }, 'Download URL generated successfully');
    
  } catch (error) {
    console.error('Download resume error:', error);
    return errorResponse(res, 'Failed to generate download URL', 500);
  }
});

// Reprocess resume (frontend expects this endpoint)
const reprocessResume = asyncHandler(async (req, res) => {
  const { candidateId } = req.params;
  
  // Check permissions
  if (req.user.role === 'student' && req.user.id !== candidateId) {
    return errorResponse(res, 'Access denied', 403);
  }

  const resume = await Resume.findOne({ userId: candidateId });
  
  if (!resume) {
    return errorResponse(res, 'Resume not found', 404);
  }

  try {
    // Re-trigger the parsing process
    if (resume.fileKey) {
      const secureUrl = await getSignedFileUrl(resume.fileKey, 300);
      const parsedData = await resumeParserService.parseResume(secureUrl, resume.originalFileName);
      
      resume.parsedData = parsedData.parsedData;
      resume.aiAnalysis = parsedData.aiAnalysis;
      resume.isProcessed = true;
      resume.processedAt = new Date();
      
      await resume.save();
      
      return successResponse(res, resume, 'Resume reprocessed successfully');
    } else {
      return errorResponse(res, 'Resume file not available for reprocessing', 400);
    }
    
  } catch (error) {
    console.error('Reprocess resume error:', error);
    return errorResponse(res, 'Failed to reprocess resume', 500);
  }
});

module.exports = {
  uploadResume,
  getResume,
  getMyResume,
  getResumes,
  syncSkillsToProfile,
  viewResume,
  downloadResume,
  reprocessResume,
  updateResumeData,
  deleteResume,
  analyzeResumeForJob,
  getResumeAnalytics,
  getResumeSignedUrl
};
