const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const Company = require('../models/Company');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive user' });
    }

    // Get profile separately based on role
    try {
      if (user.role === 'candidate') {
        user.profile = await Candidate.findOne({ user: user._id });
      } else if (user.role === 'company') {
        user.profile = await Company.findOne({ user: user._id });
      }
    } catch (profileError) {
      console.log('Profile fetch error in auth middleware (non-critical):', profileError.message);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ message: 'Token expired' });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
};

const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        // Get profile separately based on role
        try {
          if (user.role === 'candidate') {
            user.profile = await Candidate.findOne({ user: user._id });
          } else if (user.role === 'company') {
            user.profile = await Company.findOne({ user: user._id });
          }
        } catch (profileError) {
          console.log('Profile fetch error in optional auth (non-critical):', profileError.message);
        }
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = {
  authenticateToken,
  authorizeRole,
  optionalAuth
};
