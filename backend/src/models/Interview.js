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
  
  // Dynamic Interview Questions Pool (AI decides count - not fixed to 5)
  questionsPool: [{
    id: String, // Unique question ID
    question: String, // The question text
    category: String, // technical, behavioral, experience, skills, culture-fit, scenario, leadership
    difficulty: String, // easy, medium, hard
    type: {
      type: String,
      enum: ['main', 'follow-up'],
      default: 'main'
    },
    answered: {
      type: Boolean,
      default: false
    },
    evaluation: {
      overallScore: Number,
      scores: {
        relevance: Number,
        clarity: Number,
        technicalDepth: Number,
        communication: Number,
        experienceAlignment: Number
      },
      strengths: [String],
      improvements: [String],
      candidateType: String,
      fitAssessment: String,
      recommendation: String,
      leadershipPotential: Boolean,
      culturalFitSignals: [String]
    },
    followUpAsked: {
      type: Boolean,
      default: false
    },
    followUpQuestion: String
  }],

  // Interview Flow Metadata
  currentQuestionIndex: {
    type: Number,
    default: 0
  },

  analysisMetadata: {
    totalQuestionsGenerated: Number, // AI-decided count (3-10)
    questionsAsked: Number, // How many questions asked so far
    followUpsAsked: Number, // How many follow-ups asked
    averageScore: Number, // Running average score
    topicsCovered: [String], // Categories covered so far
    interviewPhase: String, // 'warm-up', 'assessment', 'wrap-up'
    candidateLevel: String, // junior, mid-level, senior
    completionReasoning: String // Why interview was completed
  },

  // Comprehensive Feedback from AI
  comprehensiveFeedback: String, // 4-5 paragraph personalized feedback

  // Interview Questions and Responses
  conversation: [{
    type: {
      type: String,
      enum: ['question', 'answer', 'qa']
    },
    content: String,
    videoUrl: String,
    videoKey: String,
    answerTranscript: String,
    transcriptionConfidence: Number,
    transcriptionLanguage: String,
    transcriptionDuration: Number,
    transcriptionError: String,
    question: String,
    questionId: String,
    isFollowUp: {
      type: Boolean,
      default: false
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    aiGenerated: {
      type: Boolean,
      default: false
    },
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
