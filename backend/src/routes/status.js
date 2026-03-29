const express = require('express');
const { successResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const { checkS3Connection } = require('../config/aws');
const { RESUME_SERVICE_URL, VIDEO_SERVICE_URL, AUDIO_SERVICE_URL } = require('../config/services');

const router = express.Router();

// System status endpoint
router.get('/status', asyncHandler(async (req, res) => {
  // Check S3 connection
  const s3Status = await checkS3Connection();
  
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
      awsS3: s3Status.success ? 'connected' : 'error',
      pythonServices: {
        nlpService: RESUME_SERVICE_URL || 'not configured',
        videoAnalysis: VIDEO_SERVICE_URL || 'not configured',
        audioAnalysis: AUDIO_SERVICE_URL || 'not configured'
      }
    },
    s3Details: s3Status
  };

  return successResponse(res, status, 'System status retrieved successfully');
}));

module.exports = router;
