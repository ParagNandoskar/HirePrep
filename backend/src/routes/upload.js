const express = require('express');
const { uploadInterviewVideoToS3 } = require('../config/aws');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const { successResponse, errorResponse } = require('../utils/helpers');

const router = express.Router();

// Upload interview video to S3
router.post('/interview-video', 
  authenticate,
  authorize('candidate'),
  uploadInterviewVideoToS3.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return errorResponse(res, 'No video file uploaded', 400);
      }

      const videoData = {
        url: req.file.location,
        key: req.file.key,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname
      };

      return successResponse(res, videoData, 'Video uploaded successfully', 201);
    } catch (error) {
      console.error('Video upload error:', error);
      return errorResponse(res, 'Failed to upload video: ' + error.message, 500);
    }
  }
);

// Upload multiple interview videos
router.post('/interview-videos',
  authenticate,
  authorize('candidate'),
  uploadInterviewVideoToS3.array('videos', 10), // Max 10 videos
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return errorResponse(res, 'No video files uploaded', 400);
      }

      const videosData = req.files.map(file => ({
        url: file.location,
        key: file.key,
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname
      }));

      return successResponse(res, { videos: videosData }, 'Videos uploaded successfully', 201);
    } catch (error) {
      console.error('Videos upload error:', error);
      return errorResponse(res, 'Failed to upload videos: ' + error.message, 500);
    }
  }
);

module.exports = router;
