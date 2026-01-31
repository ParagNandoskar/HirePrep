const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const generateToken = (payload) => {
  // Add additional security claims
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000), // Issued at
      jti: crypto.randomBytes(16).toString('hex') // JWT ID (unique)
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h', // Reduced from 7d
      algorithm: 'HS256',
      issuer: 'hireprep-api',
      audience: 'hireprep-client'
    }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'hireprep-api',
      audience: 'hireprep-client'
    });
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const generateRefreshToken = (payload) => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: '7d', // Refresh valid for 7 days
      algorithm: 'HS256',
      issuer: 'hireprep-api'
    }
  );
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
      issuer: 'hireprep-api'
    });
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken
};
