const mongoose = require('mongoose');

/**
 * VideoAnalysisFrame Model
 * 
 * Stores frame-by-frame video analysis data during interviews.
 * This allows detailed temporal analysis of candidate behavior,
 * confidence levels, and engagement throughout the interview.
 * 
 * Use Cases:
 * - Track confidence changes during specific questions
 * - Identify moments of nervousness or looking away (cheating detection)
 * - Generate detailed timeline reports
 * - Correlate visual behavior with question difficulty
 */

const videoAnalysisFrameSchema = new mongoose.Schema({
  // References
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true,
    index: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  questionId: {
    type: Number,
    required: false,
    index: true,
    comment: 'Question being answered when this frame was captured'
  },
  
  // Temporal Data
  timestamp: {
    type: Date,
    required: true,
    index: true,
    default: Date.now
  },
  interviewElapsedTime: {
    type: Number, // seconds since interview started
    required: false
  },
  questionElapsedTime: {
    type: Number, // seconds since current question started
    required: false
  },
  
  // Frame Metadata
  frameNumber: {
    type: Number,
    required: false
  },
  
  // Face Detection (MediaPipe)
  faceDetection: {
    detected: {
      type: Boolean,
      required: true,
      default: false
    },
    confidence: {
      type: Number, // 0.0 - 1.0
      required: false
    },
    
    // Head Pose (degrees)
    headPose: {
      pitch: Number, // Up/down (-90 to +90)
      yaw: Number,   // Left/right (-90 to +90)
      roll: Number   // Tilt (-180 to +180)
    },
    
    // Gaze Direction
    gaze: {
      x: Number, // Horizontal gaze (-1 to +1)
      y: Number  // Vertical gaze (-1 to +1)
    },
    
    // Looking Away Detection (Cheating/Reading)
    lookingAway: {
      type: Boolean,
      default: false,
      comment: 'True if candidate is looking away from camera (potential cheating)'
    },
    lookingAwayDirection: {
      type: String,
      enum: ['left', 'right', 'up', 'down', 'none'],
      default: 'none'
    }
  },
  
  // Emotion Analysis (DeepFace)
  emotion: {
    dominant: {
      type: String,
      enum: ['happy', 'sad', 'angry', 'fear', 'surprise', 'disgust', 'neutral'],
      required: false
    },
    scores: {
      happy: Number,
      sad: Number,
      angry: Number,
      fear: Number,
      surprise: Number,
      disgust: Number,
      neutral: Number
    }
  },
  
  // Confidence Scores (0-100)
  scores: {
    eyeContact: {
      type: Number,
      min: 0,
      max: 100,
      required: false
    },
    engagement: {
      type: Number,
      min: 0,
      max: 100,
      required: false
    },
    videoConfidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      comment: 'Overall confidence score combining eye contact and emotion'
    }
  },
  
  // Analysis Metadata
  processingTime: {
    type: Number, // milliseconds
    required: false
  },
  version: {
    type: String,
    default: 'v2.0', // MediaPipe + DeepFace dual-modal
    comment: 'Analysis algorithm version for backward compatibility'
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  // Time-series collection optimization (MongoDB 5.0+)
  timeseries: {
    timeField: 'timestamp',
    metaField: 'interviewId',
    granularity: 'seconds'
  }
});

// Compound Indexes for efficient queries
videoAnalysisFrameSchema.index({ interviewId: 1, timestamp: 1 });
videoAnalysisFrameSchema.index({ interviewId: 1, questionId: 1, timestamp: 1 });
videoAnalysisFrameSchema.index({ candidateId: 1, timestamp: -1 });
videoAnalysisFrameSchema.index({ interviewId: 1, 'faceDetection.lookingAway': 1 }); // Find cheating moments

// Static Methods

/**
 * Get frame-by-frame data for an interview
 */
videoAnalysisFrameSchema.statics.getInterviewFrames = async function(interviewId, options = {}) {
  const { questionId, startTime, endTime, limit = 1000 } = options;
  
  const query = { interviewId };
  if (questionId) query.questionId = questionId;
  if (startTime || endTime) {
    query.timestamp = {};
    if (startTime) query.timestamp.$gte = new Date(startTime);
    if (endTime) query.timestamp.$lte = new Date(endTime);
  }
  
  return this.find(query)
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
};

/**
 * Get aggregated statistics for an interview
 */
videoAnalysisFrameSchema.statics.getInterviewStats = async function(interviewId) {
  return this.aggregate([
    { $match: { interviewId: mongoose.Types.ObjectId(interviewId) } },
    {
      $group: {
        _id: '$questionId',
        avgConfidence: { $avg: '$scores.videoConfidence' },
        avgEyeContact: { $avg: '$scores.eyeContact' },
        avgEngagement: { $avg: '$scores.engagement' },
        totalFrames: { $sum: 1 },
        framesLookingAway: {
          $sum: { $cond: ['$faceDetection.lookingAway', 1, 0] }
        },
        dominantEmotion: { $first: '$emotion.dominant' },
        startTime: { $min: '$timestamp' },
        endTime: { $max: '$timestamp' }
      }
    },
    { $sort: { startTime: 1 } }
  ]);
};

/**
 * Get confidence trend data (for charts)
 */
videoAnalysisFrameSchema.statics.getConfidenceTrend = async function(interviewId, intervalSeconds = 5) {
  return this.aggregate([
    { $match: { interviewId: mongoose.Types.ObjectId(interviewId) } },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: {
          $toDate: {
            $subtract: [
              { $toLong: '$timestamp' },
              { $mod: [{ $toLong: '$timestamp' }, intervalSeconds * 1000] }
            ]
          }
        },
        avgConfidence: { $avg: '$scores.videoConfidence' },
        avgEyeContact: { $avg: '$scores.eyeContact' },
        questionId: { $first: '$questionId' },
        emotionCounts: { $push: '$emotion.dominant' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

/**
 * Detect cheating incidents (looking away patterns)
 */
videoAnalysisFrameSchema.statics.detectCheating = async function(interviewId) {
  return this.aggregate([
    {
      $match: {
        interviewId: mongoose.Types.ObjectId(interviewId),
        'faceDetection.lookingAway': true
      }
    },
    {
      $group: {
        _id: '$questionId',
        incidents: { $sum: 1 },
        avgLookAwayConfidence: { $avg: '$scores.videoConfidence' },
        directions: { $push: '$faceDetection.lookingAwayDirection' },
        timestamps: { $push: '$timestamp' }
      }
    },
    { $match: { incidents: { $gte: 5 } } }, // Flag if 5+ frames looking away
    { $sort: { incidents: -1 } }
  ]);
};

// TTL Index: Auto-delete frames older than 90 days (optional - for GDPR compliance)
// videoAnalysisFrameSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('VideoAnalysisFrame', videoAnalysisFrameSchema);
