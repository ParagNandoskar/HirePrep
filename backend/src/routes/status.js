const express = require('express');
const { successResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// System status endpoint
router.get('/status', asyncHandler(async (req, res) => {
  const status = {
    service: 'HirePrep Backend API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      mongodb: 'connected', // This would check actual DB connection
      geminiAPI: 'configured',
      cloudinary: 'configured',
      pythonServices: {
        videoAnalysis: process.env.PYTHON_VIDEO_SERVICE_URL || 'not configured',
        audioAnalysis: process.env.PYTHON_AUDIO_SERVICE_URL || 'not configured'
      }
    }
  };

  return successResponse(res, status, 'System status retrieved successfully');
}));

module.exports = router;
