const express = require('express');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('candidate', 'company').required(),
  firstName: Joi.string().when('role', {
    is: 'candidate',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  lastName: Joi.string().when('role', {
    is: 'candidate',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  companyName: Joi.string().when('role', {
    is: 'company',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  industry: Joi.string().when('role', {
    is: 'company',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  }),
  companySize: Joi.string().valid('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+').when('role', {
    is: 'company',
    then: Joi.required(),
    otherwise: Joi.forbidden()
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user (candidate or company)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password, role, firstName, lastName, companyName, industry, companySize } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = new User({
      email,
      password,
      role
    });

    await user.save();

    // Create profile based on role
    let profile;
    if (role === 'candidate') {
      profile = new Candidate({
        user: user._id,
        firstName,
        lastName
      });
    } else {
      profile = new Company({
        user: user._id,
        companyName,
        industry,
        companySize
      });
    }

    await profile.save();

    // Update user with profile reference
    user.profile = profile._id;
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: profile
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = req.body;

    // Find user without populate first
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials or account deactivated' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get profile separately based on role
    let profile = null;
    try {
      if (user.role === 'candidate') {
        profile = await Candidate.findOne({ user: user._id });
      } else if (user.role === 'company') {
        profile = await Company.findOne({ user: user._id });
      }
    } catch (profileError) {
      console.log('Profile fetch error (non-critical):', profileError.message);
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin,
        profile: profile
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// @route   POST /api/auth/verify-token
// @desc    Verify JWT token
// @access  Private
router.post('/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    // Get profile separately based on role
    let profile = null;
    try {
      if (user.role === 'candidate') {
        profile = await Candidate.findOne({ user: user._id });
      } else if (user.role === 'company') {
        profile = await Company.findOne({ user: user._id });
      }
    } catch (profileError) {
      console.log('Profile fetch error (non-critical):', profileError.message);
    }

    res.json({
      success: true,
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: profile
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Token verification failed' });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Private
router.post('/refresh-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    // Generate new token
    const newToken = generateToken(user._id);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    console.error('Token refresh error:', error);
    res.status(500).json({ message: 'Token refresh failed' });
  }
});

module.exports = router;
