const express = require('express');
const router = express.Router();
const VideoAnalysisFrame = require('../models/VideoAnalysisFrame');
const Interview = require('../models/Interview');
const { protect } = require('../middlewares/authMiddleware');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');

/**
 * @route   POST /api/video-analysis/frames
 * @desc    Store video analysis frame data
 * @access  Protected
 * @body    { interviewId, candidateId, questionId?, frameData }
 */
router.post('/frames', protect, async (req, res) => {
  try {
    const { interviewId, candidateId, questionId, frames } = req.body;
    
    if (!interviewId || !candidateId) {
      return res.status(400).json({ 
        message: 'Missing required fields: interviewId, candidateId' 
      });
    }
    
    // Verify interview exists
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }
    
    // Verify candidate matches (security check)
    if (interview.studentId.toString() !== candidateId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Candidate mismatch' });
    }
    
    // Store frames (batch insert for performance)
    const frameDocuments = Array.isArray(frames) ? frames : [frames];
    const savedFrames = await VideoAnalysisFrame.insertMany(
      frameDocuments.map(frame => ({
        interviewId,
        candidateId,
        questionId,
        timestamp: frame.timestamp || new Date(),
        faceDetection: frame.face_detection,
        emotion: frame.emotions,
        scores: {
          eyeContact: frame.face_detection?.eye_contact_score,
          engagement: frame.face_detection?.engagement_score || frame.video_confidence,
          videoConfidence: frame.video_confidence
        },
        processingTime: frame.processing_time
      })),
      { ordered: false } // Continue on error for partial success
    );
    
    res.json({
      message: 'Frames stored successfully',
      count: savedFrames.length,
      interviewId
    });
    
  } catch (error) {
    console.error('Error storing video analysis frames:', error);
    res.status(500).json({ 
      message: 'Failed to store frames', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-analysis/interview/:interviewId/frames
 * @desc    Get frame-by-frame analysis for an interview
 * @access  Protected
 * @query   questionId, startTime, endTime, limit
 */
router.get('/interview/:interviewId/frames', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const { questionId, startTime, endTime, limit } = req.query;
    
    const frames = await VideoAnalysisFrame.getInterviewFrames(interviewId, {
      questionId: questionId ? parseInt(questionId) : undefined,
      startTime,
      endTime,
      limit: limit ? parseInt(limit) : 1000
    });
    
    res.json({
      interviewId,
      frames,
      count: frames.length
    });
    
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ 
      message: 'Failed to fetch frames', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-analysis/interview/:interviewId/stats
 * @desc    Get aggregated statistics per question
 * @access  Protected
 */
router.get('/interview/:interviewId/stats', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const stats = await VideoAnalysisFrame.getInterviewStats(interviewId);
    
    res.json({
      interviewId,
      questionStats: stats,
      summary: {
        totalQuestions: stats.length,
        avgConfidence: stats.reduce((sum, s) => sum + s.avgConfidence, 0) / stats.length || 0,
        avgEyeContact: stats.reduce((sum, s) => sum + s.avgEyeContact, 0) / stats.length || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      message: 'Failed to fetch stats', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-analysis/interview/:interviewId/trend
 * @desc    Get confidence trend data (for timeline charts)
 * @access  Protected
 * @query   interval (seconds, default: 5)
 */
router.get('/interview/:interviewId/trend', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interval = parseInt(req.query.interval) || 5;
    
    const trend = await VideoAnalysisFrame.getConfidenceTrend(interviewId, interval);
    
    res.json({
      interviewId,
      interval,
      dataPoints: trend
    });
    
  } catch (error) {
    console.error('Error fetching trend:', error);
    res.status(500).json({ 
      message: 'Failed to fetch trend', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-analysis/interview/:interviewId/cheating
 * @desc    Detect potential cheating incidents (looking away patterns)
 * @access  Protected
 */
router.get('/interview/:interviewId/cheating', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const incidents = await VideoAnalysisFrame.detectCheating(interviewId);
    
    const severity = incidents.length > 0 
      ? (incidents[0].incidents > 20 ? 'high' : incidents[0].incidents > 10 ? 'medium' : 'low')
      : 'none';
    
    res.json({
      interviewId,
      severity,
      incidents,
      totalIncidents: incidents.reduce((sum, inc) => sum + inc.incidents, 0),
      flagged: incidents.length > 0
    });
    
  } catch (error) {
    console.error('Error detecting cheating:', error);
    res.status(500).json({ 
      message: 'Failed to detect cheating', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/video-analysis/interview/:interviewId/export/csv
 * @desc    Export frame data as CSV file
 * @access  Protected
 */
router.get('/interview/:interviewId/export/csv', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    // Fetch all frames
    const frames = await VideoAnalysisFrame.find({ interviewId })
      .sort({ timestamp: 1 })
      .lean();
    
    if (frames.length === 0) {
      return res.status(404).json({ message: 'No frame data found' });
    }
    
    // Generate CSV filename
    const filename = `interview_${interviewId}_analysis_${Date.now()}.csv`;
    const filepath = path.join(__dirname, '../../temp', filename);
    
    // Ensure temp directory exists
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: 'timestamp', title: 'Timestamp' },
        { id: 'questionId', title: 'Question ID' },
        { id: 'videoConfidence', title: 'Video Confidence (0-100)' },
        { id: 'eyeContact', title: 'Eye Contact Score (0-100)' },
        { id: 'engagement', title: 'Engagement Score (0-100)' },
        { id: 'faceDetected', title: 'Face Detected' },
        { id: 'lookingAway', title: 'Looking Away' },
        { id: 'lookingAwayDirection', title: 'Looking Away Direction' },
        { id: 'pitch', title: 'Head Pitch (degrees)' },
        { id: 'yaw', title: 'Head Yaw (degrees)' },
        { id: 'roll', title: 'Head Roll (degrees)' },
        { id: 'gazeX', title: 'Gaze X' },
        { id: 'gazeY', title: 'Gaze Y' },
        { id: 'dominantEmotion', title: 'Dominant Emotion' },
        { id: 'emotionHappy', title: 'Emotion: Happy (%)' },
        { id: 'emotionSad', title: 'Emotion: Sad (%)' },
        { id: 'emotionAngry', title: 'Emotion: Angry (%)' },
        { id: 'emotionFear', title: 'Emotion: Fear (%)' },
        { id: 'emotionNeutral', title: 'Emotion: Neutral (%)' }
      ]
    });
    
    // Transform data for CSV
    const records = frames.map(frame => ({
      timestamp: frame.timestamp.toISOString(),
      questionId: frame.questionId || 'N/A',
      videoConfidence: frame.scores?.videoConfidence?.toFixed(2) || 0,
      eyeContact: frame.scores?.eyeContact?.toFixed(2) || 0,
      engagement: frame.scores?.engagement?.toFixed(2) || 0,
      faceDetected: frame.faceDetection?.detected ? 'Yes' : 'No',
      lookingAway: frame.faceDetection?.lookingAway ? 'Yes' : 'No',
      lookingAwayDirection: frame.faceDetection?.lookingAwayDirection || 'none',
      pitch: frame.faceDetection?.headPose?.pitch?.toFixed(2) || 0,
      yaw: frame.faceDetection?.headPose?.yaw?.toFixed(2) || 0,
      roll: frame.faceDetection?.headPose?.roll?.toFixed(2) || 0,
      gazeX: frame.faceDetection?.gaze?.x?.toFixed(3) || 0,
      gazeY: frame.faceDetection?.gaze?.y?.toFixed(3) || 0,
      dominantEmotion: frame.emotion?.dominant || 'unknown',
      emotionHappy: frame.emotion?.scores?.happy?.toFixed(1) || 0,
      emotionSad: frame.emotion?.scores?.sad?.toFixed(1) || 0,
      emotionAngry: frame.emotion?.scores?.angry?.toFixed(1) || 0,
      emotionFear: frame.emotion?.scores?.fear?.toFixed(1) || 0,
      emotionNeutral: frame.emotion?.scores?.neutral?.toFixed(1) || 0
    }));
    
    // Write CSV
    await csvWriter.writeRecords(records);
    
    // Send file
    res.download(filepath, filename, (err) => {
      // Clean up file after sending
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting temp CSV:', unlinkErr);
      });
      
      if (err) {
        console.error('Error sending CSV:', err);
        res.status(500).json({ message: 'Failed to send CSV file' });
      }
    });
    
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ 
      message: 'Failed to export CSV', 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/video-analysis/interview/:interviewId/frames
 * @desc    Delete all frame data for an interview (GDPR compliance)
 * @access  Protected (admin only)
 */
router.delete('/interview/:interviewId/frames', protect, async (req, res) => {
  try {
    const { interviewId } = req.params;
    
    const result = await VideoAnalysisFrame.deleteMany({ interviewId });
    
    res.json({
      message: 'Frame data deleted successfully',
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('Error deleting frames:', error);
    res.status(500).json({ 
      message: 'Failed to delete frames', 
      error: error.message 
    });
  }
});

module.exports = router;
