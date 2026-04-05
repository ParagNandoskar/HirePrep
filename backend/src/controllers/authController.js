const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const { OAuth2Client } = require('google-auth-library');

const googleOAuthClient = new OAuth2Client();

const roleMapping = {
  candidate: 'student',
  employer: 'company',
  student: 'student',
  company: 'company'
};

const frontendRoleMapping = {
  student: 'candidate',
  company: 'employer'
};

const mapToFrontendUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: frontendRoleMapping[user.role] || user.role,
  profile: user.profile,
  avatar: user.avatar,
  isVerified: user.isVerified,
  createdAt: user.createdAt
});

const getGoogleAudiences = () => {
  const fromEnv = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_AUTH_CLIENT_ID,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(fromEnv)];
};

// Register user (student or company)
const register = asyncHandler(async (req, res) => {
  const { name, firstName, lastName, email, password, role, profile } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return errorResponse(res, 'User with this email already exists', 400);
  }

  // Handle name format (support both name and firstName/lastName)
  let fullName = name;
  if (!fullName && firstName) {
    // If lastName is empty or not provided, just use firstName
    if (lastName && lastName.trim() !== '') {
      fullName = `${firstName} ${lastName}`;
    } else {
      fullName = firstName;
    }
  }

  // Map frontend roles to backend roles
  const mappedRole = roleMapping[role] || role;

  // Create user
  const userData = {
    name: fullName,
    email,
    password,
    role: mappedRole,
    profile: profile || {}
  };

  const user = new User(userData);
  await user.save();

  // Generate tokens
  const token = generateToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  // Map backend roles back to frontend format for response
  return successResponse(res, {
    user: mapToFrontendUser(user),
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

  if (!user.password) {
    return errorResponse(res, 'This account uses Google sign-in. Please continue with Google.', 400);
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
    user: mapToFrontendUser(user),
    token,
    refreshToken
  }, 'Login successful');
});

// Google OAuth login/signup
const googleAuth = asyncHandler(async (req, res) => {
  const { idToken, role, mode, profile } = req.body;

  const audience = getGoogleAudiences();
  if (audience.length === 0) {
    return errorResponse(res, 'Google OAuth is not configured on server', 500);
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience,
    });
    payload = ticket.getPayload();
  } catch (error) {
    return errorResponse(res, 'Invalid Google token', 401);
  }

  if (!payload?.email || !payload?.sub) {
    return errorResponse(res, 'Unable to read Google account details', 400);
  }

  if (payload.email_verified !== true) {
    return errorResponse(res, 'Google account email is not verified', 400);
  }

  const email = String(payload.email).toLowerCase();
  const mappedRole = roleMapping[role] || 'student';
  const googleName = payload.name || profile?.name || 'Google User';

  let user = await User.findOne({ email });

  if (mode === 'signup' && user) {
    return errorResponse(res, 'User with this email already exists', 400);
  }

  if (mode === 'login' && !user) {
    return errorResponse(res, 'No account found for this Google email. Please sign up first.', 404);
  }

  if (!user) {
    user = new User({
      name: googleName,
      email,
      role: mappedRole,
      authProvider: 'google',
      googleId: payload.sub,
      isVerified: true,
      avatar: payload.picture || null,
      profile: profile || {}
    });
    await user.save();
  } else {
    let shouldSave = false;

    if (!user.googleId) {
      user.googleId = payload.sub;
      shouldSave = true;
    }

    if (user.authProvider !== 'google' && !user.password) {
      user.authProvider = 'google';
      shouldSave = true;
    }

    if (!user.avatar && payload.picture) {
      user.avatar = payload.picture;
      shouldSave = true;
    }

    if (shouldSave) {
      await user.save();
    }
  }

  const token = generateToken({ id: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ id: user._id, role: user.role });

  return successResponse(res, {
    user: mapToFrontendUser(user),
    token,
    refreshToken
  }, 'Google authentication successful');
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
// Get user profile
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
      role: frontendRoleMapping[user.role] || user.role,
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
  googleAuth,
  refreshAccessToken,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  getUserStats
};
