const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

// Register user (student or company)
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, profile } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'User with this email already exists', 400);
  }

  // Create user
  const userData = {
    name,
    email,
    password,
    role,
    profile: profile || {}
  };

  const user = new User(userData);
  await user.save();

  // Generate tokens
  const token = generateToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  return successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      avatar: user.avatar,
      createdAt: user.createdAt
    },
    token,
    refreshToken
  }, 'User registered successfully', 201);
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return errorResponse(res, 'Invalid email or password', 401);
  }

  // Generate tokens
  const token = generateToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  return successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt
    },
    token,
    refreshToken
  }, 'Login successful');
});

// Refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return errorResponse(res, 'Refresh token is required', 400);
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    // Generate new access token
    const newToken = generateToken({ id: user._id, role: user.role });

    return successResponse(res, {
      token: newToken
    }, 'Token refreshed successfully');
  } catch (error) {
    return errorResponse(res, 'Invalid refresh token', 401);
  }
});

// Get current user profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  return successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }, 'Profile retrieved successfully');
});

// Update user profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, profile, avatar } = req.body;
  const userId = req.user.id;

  const updateData = {};
  if (name) updateData.name = name;
  if (profile) updateData.profile = { ...req.user.profile, ...profile };
  if (avatar) updateData.avatar = avatar;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  );

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  return successResponse(res, {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      avatar: user.avatar,
      isVerified: user.isVerified,
      updatedAt: user.updatedAt
    }
  }, 'Profile updated successfully');
});

// Change password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return errorResponse(res, 'Current password and new password are required', 400);
  }

  if (newPassword.length < 6) {
    return errorResponse(res, 'New password must be at least 6 characters long', 400);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Check current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return errorResponse(res, 'Current password is incorrect', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  return successResponse(res, null, 'Password changed successfully');
});

// Logout (client-side token invalidation)
const logout = asyncHandler(async (req, res) => {
  // In a production app, you might want to maintain a blacklist of tokens
  // For now, we'll just send a success response as the client will remove the token
  return successResponse(res, null, 'Logged out successfully');
});

// Get user statistics (for dashboard)
const getUserStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let stats = {};

  if (userRole === 'student') {
    // Get student statistics
    const Resume = require('../models/Resume');
    const Interview = require('../models/Interview');
    
    const [resumeCount, interviewCount, completedInterviews] = await Promise.all([
      Resume.countDocuments({ userId }),
      Interview.countDocuments({ studentId: userId }),
      Interview.countDocuments({ studentId: userId, status: 'completed' })
    ]);

    stats = {
      resumesUploaded: resumeCount,
      totalInterviews: interviewCount,
      completedInterviews,
      pendingInterviews: interviewCount - completedInterviews
    };
  } else if (userRole === 'company') {
    // Get company statistics
    const Job = require('../models/Job');
    const Interview = require('../models/Interview');
    
    const jobs = await Job.find({ companyId: userId });
    const jobIds = jobs.map(job => job._id);
    
    const [activeJobs, totalApplicants, totalInterviews] = await Promise.all([
      Job.countDocuments({ companyId: userId, status: 'active' }),
      Job.aggregate([
        { $match: { companyId: userId } },
        { $unwind: '$applicants' },
        { $count: 'totalApplicants' }
      ]),
      Interview.countDocuments({ jobId: { $in: jobIds } })
    ]);

    stats = {
      activeJobs,
      totalJobs: jobs.length,
      totalApplicants: totalApplicants[0]?.totalApplicants || 0,
      totalInterviews
    };
  }

  return successResponse(res, stats, 'User statistics retrieved successfully');
});

module.exports = {
  register,
  login,
  refreshAccessToken,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getUserStats
};
