const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  candidates: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    },
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview'
    },
    
    // Individual Scores
    scores: {
      resumeMatchScore: {
        type: Number,
        min: 0,
        max: 100
      },
      videoAnalysisScore: {
        type: Number,
        min: 0,
        max: 100
      },
      audioAnalysisScore: {
        type: Number,
        min: 0,
        max: 100
      },
      qaScore: {
        type: Number,
        min: 0,
        max: 100
      },
      overallScore: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    
    // Ranking
    rank: {
      type: Number,
      min: 1
    },
    
    // Detailed Analysis
    analysis: {
      strengths: [String],
      weaknesses: [String],
      skillsMatch: [{
        skill: String,
        required: Boolean,
        studentHas: Boolean,
        proficiency: String
      }],
      recommendations: [String]
    },
    
    // Status
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired'],
      default: 'pending'
    },
    
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Leaderboard Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  totalCandidates: {
    type: Number,
    default: 0
  },
  averageScore: Number,
  topPercentile: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: Number,
    percentile: Number
  }]
}, {
  timestamps: true
});

// Index for better query performance
leaderboardSchema.index({ jobId: 1 });
leaderboardSchema.index({ 'candidates.studentId': 1 });
leaderboardSchema.index({ 'candidates.rank': 1 });
leaderboardSchema.index({ 'candidates.scores.overallScore': -1 });
leaderboardSchema.index({ lastUpdated: -1 });

// Pre-save middleware to update metadata
leaderboardSchema.pre('save', function(next) {
  this.totalCandidates = this.candidates.length;
  this.lastUpdated = new Date();
  
  if (this.candidates.length > 0) {
    const totalScore = this.candidates.reduce((sum, candidate) => 
      sum + (candidate.scores.overallScore || 0), 0);
    this.averageScore = totalScore / this.candidates.length;
  }
  
  next();
});

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
