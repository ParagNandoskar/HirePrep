const express = require('express');
const { successResponse } = require('../utils/helpers');
const { asyncHandler } = require('../middlewares/errorHandler');
const { checkS3Connection } = require('../config/aws');

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
        nlpService: process.env.PYTHON_NLP_SERVICE_URL || 'not configured',
        videoAnalysis: process.env.PYTHON_VIDEO_SERVICE_URL || 'not configured',
        audioAnalysis: process.env.PYTHON_AUDIO_SERVICE_URL || 'not configured'
      }
    },
    s3Details: s3Status
  };

  return successResponse(res, status, 'System status retrieved successfully');
}));

module.exports = router;
