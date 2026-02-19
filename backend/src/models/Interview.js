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
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: false // Only for screening interviews
  },
  type: {
    type: String,
    enum: ['mock', 'live', 'screening'],
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
  score: {
    type: Number, // Overall interview score 0-100
    required: false
  },
  
  // Interview Questions and Responses
  conversation: [{
    type: {
      type: String,
      enum: ['question', 'answer', 'qa'] // Added 'qa' for combined question-answer
    },
    content: String,
    videoUrl: String, // AWS S3 URL for video response (temporary - deleted after analysis)
    videoKey: String, // AWS S3 key for video management
    
    // Transcription fields (Phase 1)
    answerTranscript: String, // ✅ Actual spoken answer text
    transcriptionConfidence: Number, // 0-1 confidence score from STT service
    transcriptionLanguage: String, // e.g., 'en-US'
    transcriptionDuration: Number, // Duration in seconds
    transcriptionError: String, // Error message if transcription failed
    
    // Question details
    question: String, // The question text
    questionId: {
      type: Number, // Store the question ID for reliable lookup
      required: false
    },
    
    timestamp: {
      type: Date,
      default: Date.now
    },
    aiGenerated: {
      type: Boolean,
      default: false
    },
    
    // Analysis status tracking
    analysisStatus: {
      transcribed: { type: Boolean, default: false },
      videoAnalyzed: { type: Boolean, default: false },
      audioAnalyzed: { type: Boolean, default: false },
      videoDeleted: { type: Boolean, default: false }
    }
  }],
  
  // Overall analysis completion tracking
  analysisComplete: {
    type: Boolean,
    default: false
  },
  preliminaryScore: Number, // AI text evaluation score (available in 60-90s)
  finalScore: Number, // Complete score including video/audio (available in 5-10 min)

  // AI Analysis Results
  analysis: {
    // Video Analysis (Phase 3 - Async after submission)
    videoAnalysis: {
      emotionScores: [{
        emotion: String, // happy, sad, angry, surprised, fear, disgust, neutral
        score: Number,
        timestamp: Date
      }],
      eyeContactScore: Number, // 0-100
      engagementScore: Number, // 0-100
      confidenceScore: Number, // 0-100
      overallVideoScore: Number, // 0-100
      processingTime: Number, // seconds taken for analysis
      analyzedAt: Date
    },

    // Audio Analysis (Phase 3 - Async after submission)
    audioAnalysis: {
      toneAnalysis: {
        confidence: Number, // 0-100
        enthusiasm: Number, // 0-100
        clarity: Number, // 0-100
        pace: String, // slow, moderate, fast
        wordsPerMinute: Number // Speech rate
      },
      sentimentScores: [{
        sentiment: String, // positive, negative, neutral
        score: Number,
        timestamp: Date
      }],
      stressLevel: Number, // 0-100
      pitchVariation: Number, // Voice confidence indicator
      energyLevel: Number, // 0-100
      overallAudioScore: Number, // 0-100
      processingTime: Number, // seconds taken for analysis
      analyzedAt: Date
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

  // Screening Interview Evaluation (simplified for screening)
  evaluation: {
    technicalScore: Number,
    communicationScore: Number,
    problemSolvingScore: Number,
    overallScore: Number,
    feedback: String,
    strengths: [String], // Key strengths identified by AI
    improvements: [String], // Areas for improvement
    recommendation: { // AI hiring recommendation
      type: String,
      enum: ['hire', 'maybe', 'no-hire'],
      default: 'maybe'
    }
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
interviewSchema.index({ applicationId: 1 });
interviewSchema.index({ status: 1 });
interviewSchema.index({ startTime: 1 });
interviewSchema.index({ jobId: 1, type: 1, status: 1, score: -1 }); // For leaderboard queries

module.exports = mongoose.model('Interview', interviewSchema);
