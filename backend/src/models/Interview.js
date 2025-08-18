const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  type: {
    type: String,
    enum: ['mock', 'live'],
    default: 'mock'
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  duration: {
    type: Number, // in minutes
    default: 30
  },
  startTime: Date,
  endTime: Date,
  
  // Interview Questions and Responses
  conversation: [{
    type: {
      type: String,
      enum: ['question', 'answer']
    },
    content: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    aiGenerated: {
      type: Boolean,
      default: false
    }
  }],

  // AI Analysis Results
  analysis: {
    // Video Analysis
    videoAnalysis: {
      emotionScores: [{
        emotion: String, // happy, sad, angry, surprised, fear, disgust, neutral
        score: Number,
        timestamp: Date
      }],
      eyeContactScore: Number, // 0-100
      engagementScore: Number, // 0-100
      confidenceScore: Number, // 0-100
      overallVideoScore: Number // 0-100
    },

    // Audio Analysis
    audioAnalysis: {
      toneAnalysis: {
        confidence: Number, // 0-100
        enthusiasm: Number, // 0-100
        clarity: Number, // 0-100
        pace: String // slow, moderate, fast
      },
      sentimentScores: [{
        sentiment: String, // positive, negative, neutral
        score: Number,
        timestamp: Date
      }],
      stressLevel: Number, // 0-100
      overallAudioScore: Number // 0-100
    },

    // Question-Answer Analysis
    qaAnalysis: {
      responses: [{
        questionId: Number,
        question: String,
        answer: String,
        relevanceScore: Number, // 0-100
        completenessScore: Number, // 0-100
        technicalAccuracy: Number, // 0-100
        communicationScore: Number // 0-100
      }],
      overallQAScore: Number // 0-100
    },

    // Overall Scores
    overallScore: Number, // Weighted average of all analysis
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },

  // Technical Details
  recordingUrl: String, // Cloudinary URL for recording
  metadata: {
    browser: String,
    os: String,
    connectionQuality: String
  }
}, {
  timestamps: true
});

// Index for better query performance
interviewSchema.index({ studentId: 1 });
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ startTime: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
