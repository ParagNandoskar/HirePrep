const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Application = require('../models/Application');
const Job = require('../models/Job');
const Resume = require('../models/Resume');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const { deleteFromS3, extractFileKeyFromUrl } = require('../config/aws');

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
  return successResponse(res, candidate.toObject(), 'Profile retrieved successfully');
});

// Update candidate profile
const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const updateData = req.body;

  console.log('DEBUG: Updating candidate profile for user:', userId);
  console.log('DEBUG: Update data received:', updateData);

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
  
  // FIX 2: Convert the Mongoose object to a plain JavaScript object before returning.
  const updatedCandidate = candidate.toObject();

  console.log('DEBUG: Profile updated successfully');
  // FIX 3: Return the clean object
  return successResponse(res, updatedCandidate, 'Profile updated successfully');
});

// Get candidate applications
const getApplications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, status } = req.query;

  const filter = { candidateId: userId };
  if (status) {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate({
      path: 'jobId',
      select: 'title description company location compensation jobDetails status',
      populate: {
        path: 'company',
        select: 'companyName logo'
      }
    })
    .sort({ appliedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Application.countDocuments(filter);

  // Transform the data to match frontend expectations
  const transformedApplications = applications.map(app => ({
    _id: app._id,
    status: app.status,
    appliedAt: app.appliedAt,
    matchScore: app.matchScore?.overall,
    job: {
      _id: app.jobId?._id,
      title: app.jobId?.title,
      description: app.jobId?.description,
      company: {
        companyName: app.jobId?.company?.companyName,
        logo: app.jobId?.company?.logo
      },
      location: app.jobId?.location,
      compensation: app.jobId?.compensation,
      jobDetails: app.jobId?.jobDetails,
      status: app.jobId?.status
    },
    coverLetter: app.coverLetter,
    timeline: app.timeline,
    interviews: app.interviews,
    offer: app.offer
  }));

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
    Candidate.findOne({ userId }).populate('resume')
  ]);

  const stats = {
    totalApplications,
    interviewsScheduled,
    offersReceived,
    resumesUploaded: candidate?.resume ? 1 : 0,
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
  
  if (!req.file) {
    return errorResponse(res, 'No file uploaded', 400);
  }

  const candidate = await Candidate.findOne({ userId });
  if (!candidate) {
    return errorResponse(res, 'Candidate profile not found', 404);
  }

  console.log('📸 File uploaded to S3:', {
    originalName: req.file.originalname,
    size: req.file.size,
    location: req.file.location,
    key: req.file.key
  });

  // Delete old profile image if it exists
  if (candidate.profileImage) {
    try {
      const oldFileKey = extractFileKeyFromUrl(candidate.profileImage);
      if (oldFileKey) {
        await deleteFromS3(oldFileKey);
        console.log('🗑️ Old profile image deleted from S3:', oldFileKey);
      }
    } catch (error) {
      console.error('⚠️ Failed to delete old profile image:', error.message);
      // Don't fail the upload if old image deletion fails
    }
  }

  // Update candidate profile with new image URL and metadata
  candidate.profileImage = req.file.location; // S3 URL
  candidate.profileImageKey = req.file.key; // S3 key for future deletion
  candidate.updatedAt = new Date();
  
  await candidate.save();

  console.log('✅ Profile image updated successfully:', candidate.profileImage);

  return successResponse(res, { 
    profileImage: candidate.profileImage,
    message: 'Profile image uploaded successfully'
  }, 'Avatar uploaded successfully');
});

module.exports = {
  getProfile,
  updateProfile,
  getApplications,
  updateApplication,
  getDashboardStats,
  getJobRecommendations,
  uploadAvatar
};
