const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const { deleteFromS3, extractFileKeyFromUrl, getSignedFileUrl } = require('../config/aws');

// Get candidate profile
const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Check if this is a student/candidate user
  const user = await User.findById(userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Only allow student role to access candidate endpoints
  if (user.role !== 'student') {
    return errorResponse(res, 'Access denied. This endpoint is for candidates only.', 403);
  }

  // Try to find existing candidate profile
  let candidate = await Candidate.findOne({ userId }).populate('resume');

  if (!candidate) {
    // If no candidate profile exists, create one with basic info from User
    const userName = user.name || '';
    const nameParts = userName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || 'User'; // Default lastName to avoid validation error

    candidate = new Candidate({
      userId: userId,
      firstName: firstName,
      lastName: lastName,
      email: user.email,
      skills: [],
      education: [],
      experience: [],
      projects: [],
      certifications: [],
      languages: []
    });
    
    await candidate.save();
  }

  // Convert Mongoose document to a plain JavaScript object
  const candidateData = candidate.toObject();
  
  // Generate signed URL for profile image if it exists and is from S3
  if (candidateData.profileImage && candidateData.profileImage.includes('amazonaws.com') && candidateData.profileImageKey) {
    try {
      candidateData.profileImage = await getSignedFileUrl(candidateData.profileImageKey, 604800); // 7 days
      console.log('🔐 Generated signed URL for profile retrieval:', candidateData.profileImage);
    } catch (error) {
      console.error('⚠️ Failed to generate signed URL for profile image:', error.message);
      // Keep the original URL as fallback
    }
  }
  
  return successResponse(res, candidateData, 'Profile retrieved successfully');
});

// Helper function to normalize skills from simple strings to skill objects
const normalizeSkills = (skills) => {
  if (!skills) return [];
  if (!Array.isArray(skills)) return [];

  return skills.map(skill => {
    // If it's already an object with name property, use it as-is
    if (typeof skill === 'object' && skill.name) {
      return {
        name: skill.name,
        level: skill.level || 'Intermediate',
        yearsOfExperience: skill.yearsOfExperience || 0,
        source: skill.source || 'manual'
      };
    }
    // If it's just a string, convert it to a skill object
    if (typeof skill === 'string') {
      return {
        name: skill,
        level: 'Intermediate',
        yearsOfExperience: 0,
        source: 'manual'
      };
    }
    return null;
  }).filter(s => s !== null);
};

// Update candidate profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updateData = req.body;

  console.log('DEBUG: Updating candidate profile for user:', userId);
  console.log('DEBUG: Update data received:', updateData);

  // Normalize skills if provided
  if (updateData.skills) {
    updateData.skills = normalizeSkills(updateData.skills);
  }

  // Find existing candidate or create new one
  let candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    // Create new candidate profile
    const user = await User.findById(userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    candidate = new Candidate({
      userId: userId,
      firstName: updateData.firstName || user.name?.split(' ')[0] || '',
      lastName: updateData.lastName || user.name?.split(' ').slice(1).join(' ') || '',
      email: updateData.email || user.email,
      ...updateData
    });
  } else {
    // Update existing candidate
    Object.keys(updateData).forEach(key => {
      if (key !== 'userId') { // Don't allow userId to be changed
        candidate[key] = updateData[key];
      }
    });

    // If password is in updateData, update the User model (assuming separate User model handles authentication details)
    if (updateData.password) {
        // NOTE: Hashing logic must be present in the User model's pre-save middleware!
        // We only update the password field on the User model here.
        await User.findByIdAndUpdate(userId, { password: updateData.password });
    }
  }

  await candidate.save();

  // Convert the Mongoose object to a plain JavaScript object before returning.
  const updatedCandidate = candidate.toObject();

  console.log('DEBUG: Profile updated successfully');
  // Return the clean object
  return successResponse(res, updatedCandidate, 'Profile updated successfully');
});

// Get candidate applications
const getApplications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  console.log('DEBUG: Fetching applications for user:', userId);

  const filter = { candidateId: userId };
  if (status) {
    filter.status = status;
  }

  console.log('DEBUG: Filter:', filter);

  const applications = await Application.find(filter)
    .populate({
      path: 'jobId',
      select: 'title description companyId location compensation jobDetails status',
      populate: {
        path: 'companyId',
        select: 'name email profile'
      }
    })
    .sort({ appliedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  console.log('DEBUG: Found applications:', applications.length);

  const total = await Application.countDocuments(filter);

  // Log the first application to see what data we have
  if (applications.length > 0) {
    console.log('DEBUG: First application company:', applications[0].jobId?.companyId);
  }

  // Transform the data to match frontend expectations
  const transformedApplications = applications.map(app => ({
    _id: app._id,
    status: app.status,
    appliedAt: app.appliedAt,
    matchScore: app.matchScore?.overall,
    interviewScore: app.interviewScore,
    screeningScore: app.screeningScore,
    interviewCompleted: app.interviewCompleted,
    interviewStatus: app.interviewStatus,
    interviewCompletedAt: app.interviewCompletedAt,
    questionsAnswered: app.questionsAnswered,
    aiAnalysis: {
      scores: {
        overall: app.aiAnalysis?.scores?.overall || app.screeningScore || app.interviewScore || 0
      }
    },
    job: {
      _id: app.jobId?._id,
      title: app.jobId?.title,
      description: app.jobId?.description,
      company: {
        companyName: app.jobId?.companyId?.profile?.companyName || app.jobId?.companyId?.name,
        logo: app.jobId?.companyId?.profile?.logo
      },
      location: app.jobId?.location,
      compensation: app.jobId?.compensation,
      jobDetails: app.jobId?.jobDetails,
      status: app.jobId?.status
    },
    jobId: app.jobId,
    coverLetter: app.coverLetter,
    timeline: app.timeline,
    interviews: app.interviews,
    offer: app.offer
  }));

  console.log('DEBUG: Transformed applications:', JSON.stringify(transformedApplications, null, 2));

  return successResponse(res, {
    applications: transformedApplications,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total: total
    }
  }, 'Applications retrieved successfully');
});

// Update application
const updateApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const application = await Application.findOne({
    _id: applicationId,
    candidateId: userId
  });

  if (!application) {
    return errorResponse(res, 'Application not found', 404);
  }

  // Only allow certain status updates by candidates
  const allowedStatuses = ['withdrawn', 'offer-accepted', 'offer-declined'];
  if (!allowedStatuses.includes(status)) {
    return errorResponse(res, 'Invalid status update', 400);
  }

  application.status = status;
  await application.save();

  // Return clean object
  return successResponse(res, application.toObject(), 'Application updated successfully');
});

// Get dashboard stats
const getDashboardStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    totalApplications,
    interviewsScheduled,
    offersReceived,
    resumeCount,
    candidate
  ] = await Promise.all([
    Application.countDocuments({ candidateId: userId }),
    Application.countDocuments({ 
      candidateId: userId, 
      status: { $in: ['interview-scheduled', 'interviewing'] } 
    }),
    Application.countDocuments({ 
      candidateId: userId, 
      status: { $in: ['offer-extended', 'offer-accepted', 'hired'] } 
    }),
    Resume.countDocuments({ userId }),
    Candidate.findOne({ userId })
  ]);

  const stats = {
    totalApplications,
    interviewsScheduled,
    offersReceived,
    resumesUploaded: resumeCount,
    profileCompleteness: candidate?.profileCompleteness || 0
  };

  return successResponse(res, stats, 'Dashboard stats retrieved successfully');
});

// Get job recommendations
const getJobRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 10 } = req.query;

  const candidate = await Candidate.findOne({ userId });
  if (!candidate || !candidate.skills || candidate.skills.length === 0) {
    return successResponse(res, [], 'No recommendations available. Please add skills to your profile.');
  }

  // Extract skill names for matching
  const skillNames = candidate.skills.map(skill => skill.name.toLowerCase());

  // Find jobs that match candidate skills
  const jobs = await Job.find({
    status: 'active',
    'requirements.skills.name': { 
      $in: skillNames.map(skill => new RegExp(skill, 'i'))
    }
  })
    .populate('companyId', 'profile.companyName')
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  return successResponse(res, jobs, 'Job recommendations retrieved successfully');
});

// Upload avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  console.log('📸 Profile image upload started for user:', userId);
  console.log('📸 Environment check:', {
    hasS3Bucket: !!process.env.AWS_S3_BUCKET,
    hasAwsRegion: !!process.env.AWS_REGION,
    hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
    hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
  });
  
  if (!req.file) {
    console.error('❌ No file received in request');
    return errorResponse(res, 'No file uploaded', 400);
  }

  const candidate = await Candidate.findOne({ userId });
  if (!candidate) {
    return errorResponse(res, 'Candidate profile not found', 404);
  }

  console.log('📸 File upload details:', {
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
    isLocalUpload: req.isLocalUpload,
    location: req.file.location || req.file.path,
    key: req.file.key || req.file.filename
  });

  // Determine the file URL based on upload type
  let profileImageUrl;
  let profileImageKey;

  if (req.isLocalUpload) {
    // Local upload - construct URL for serving static files
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    profileImageUrl = `${baseUrl}/uploads/profile-images/${req.file.filename}`;
    profileImageKey = req.file.filename; // Store filename for local deletion
  } else {
    // S3 upload - generate signed URL for secure access
    try {
      profileImageUrl = await getSignedFileUrl(req.file.key, 604800); // 7 days expiry
      profileImageKey = req.file.key;
      console.log('🔐 Generated signed URL for profile image:', profileImageUrl);
    } catch (error) {
      console.error('❌ Failed to generate signed URL, using direct URL:', error.message);
      // Fallback to direct URL (might not work if bucket is private)
      profileImageUrl = req.file.location;
      profileImageKey = req.file.key;
    }
  }

  // Delete old profile image if it exists
  if (candidate.profileImage && candidate.profileImageKey) {
    try {
      if (req.isLocalUpload || !candidate.profileImage.includes('amazonaws.com')) {
        // Delete local file
        const fs = require('fs');
        const path = require('path');
        const oldFilePath = path.join(__dirname, '../uploads/profile-images', candidate.profileImageKey);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          console.log('🗑️ Old local profile image deleted:', candidate.profileImageKey);
        }
      } else {
        // Delete from S3
        const oldFileKey = extractFileKeyFromUrl(candidate.profileImage);
        if (oldFileKey) {
          await deleteFromS3(oldFileKey);
          console.log('🗑️ Old S3 profile image deleted:', oldFileKey);
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to delete old profile image:', error.message);
      // Don't fail the upload if old image deletion fails
    }
  }

  // Update candidate profile with new image URL and metadata
  candidate.profileImage = profileImageUrl;
  candidate.profileImageKey = profileImageKey;
  candidate.updatedAt = new Date();
  
  await candidate.save();

  console.log('✅ Profile image updated successfully:', profileImageUrl);

  return successResponse(res, { 
    profileImage: profileImageUrl,
    message: 'Profile image uploaded successfully'
  }, 'Avatar uploaded successfully');
});

// Get upcoming interviews for candidate
const getUpcomingInterviews = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const Interview = require('../models/Interview');

  try {
    // 1. Find all scheduled interviews from Interview model (mock, live, screening)
    const mockInterviews = await Interview.find({
      studentId: userId,
      status: { $in: ['scheduled', 'in-progress'] }
    })
    .populate('jobId', 'title description companyId')
    .populate('studentId', 'name email')
    .sort({ startTime: 1 }); // Sort by start time ascending

    // 2. Find all applications with scheduled interviews for HR/company interviews
    const applicationsWithScheduled = await Application.find({
      candidateId: userId,
      'interviews.status': 'scheduled',
      'interviews.scheduledAt': { $gte: new Date() } // Only future interviews
    })
    .populate('jobId', 'title')
    .populate('companyId', 'name profile')
    .sort({ 'interviews.scheduledAt': 1 }); // Sort by date ascending

    // 3. Find all applications where user applied but hasn't started mock interview yet (pending)
    const pendingMockInterviews = await Application.find({
      candidateId: userId,
      status: { $in: ['applied', 'screening-pending', 'pending'] }
    })
    .populate('jobId', 'title companyId')
    .populate('companyId', 'name profile')
    .sort({ appliedAt: -1 });

    // 4. Filter pending interviews - exclude ones already handled by Interview model
    const interviewedJobIds = mockInterviews.map(i => i.jobId?._id?.toString());
    const pendingFiltered = pendingMockInterviews.filter(app =>
      !interviewedJobIds.includes(app.jobId?._id?.toString())
    );

    // 5. Process mock interviews from Interview model
    const upcomingInterviews = [];

    mockInterviews.forEach(interview => {
      if (interview.startTime) {
        upcomingInterviews.push({
          id: interview._id,
          date: interview.startTime.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          time: interview.startTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          company: interview.jobId?.companyId?.profile?.companyName || interview.jobId?.companyId?.name || 'Mock Interview',
          jobTitle: interview.jobId?.title || 'Mock Interview',
          type: interview.type || 'mock',
          status: interview.status,
          duration: interview.duration || 30,
          meetingLink: null,
          location: null,
          interviewer: 'AI',
          applicationId: interview.applicationId,
          interviewId: interview._id
        });
      }
    });

    // 6. Process pending mock interviews (applied but not started)
    pendingFiltered.forEach(app => {
      upcomingInterviews.push({
        id: app._id,
        date: 'Pending',
        time: 'Not scheduled',
        company: app.companyId?.profile?.companyName || app.companyId?.name || 'Unknown Company',
        jobTitle: app.jobId?.title || 'Unknown Position',
        type: 'mock',
        status: 'pending',
        duration: 30,
        meetingLink: null,
        location: null,
        interviewer: 'AI',
        applicationId: app._id,
        isPending: true
      });
    });

    // 7. Process application scheduled interviews (HR/company interviews)
    applicationsWithScheduled.forEach(app => {
      if (app.interviews && app.interviews.length > 0) {
        app.interviews.forEach(interview => {
          if (interview.status === 'scheduled' && interview.scheduledAt >= new Date()) {
            upcomingInterviews.push({
              id: interview._id,
              date: interview.scheduledAt.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }),
              time: interview.scheduledAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              }),
              company: app.companyId?.profile?.companyName || app.companyId?.name || 'Unknown Company',
              jobTitle: app.jobId?.title || 'Unknown Position',
              type: interview.type || 'Interview',
              status: interview.status,
              duration: interview.duration,
              meetingLink: interview.meetingLink,
              location: interview.location,
              interviewer: interview.interviewer,
              applicationId: app._id
            });
          }
        });
      }
    });

    // 8. Sort by status: pending first, then by date/time
    upcomingInterviews.sort((a, b) => {
      // Pending interviews first
      if (a.isPending !== b.isPending) {
        return a.isPending ? -1 : 1;
      }
      // Then sort by date/time
      if (a.date === 'Pending') return -1;
      if (b.date === 'Pending') return 1;

      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateA - dateB;
    });

    return successResponse(res, upcomingInterviews, 'Upcoming interviews retrieved successfully');
  } catch (error) {
    console.error('Error fetching upcoming interviews:', error);
    return errorResponse(res, 'Failed to retrieve upcoming interviews: ' + error.message, 500);
  }
});

module.exports = {
  getProfile,
  updateProfile,
  getApplications,
  updateApplication,
  getDashboardStats,
  getJobRecommendations,
  uploadAvatar,
  getUpcomingInterviews
};
