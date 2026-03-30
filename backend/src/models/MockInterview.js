const mongoose = require('mongoose');

const mockInterviewSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  jobContext: {
    jobTitle: { type: String, default: 'Practice Interview' },
    companyName: { type: String, default: 'HirePrep' },
    description: { type: String, default: '' },
    requiredSkills: [{ type: String }]
  },
  questionsAnswered: {
    type: Number,
    default: 0
  },
  transcript: [{
    type: {
      type: String,
      enum: ['question', 'answer']
    },
    content: String,
    questionNumber: Number,
    timestamp: Date
  }],
  analysis: {
    overallScore: Number,
    contentScore: Number,
    communicationScore: Number,
    technicalScore: Number,
    problemSolvingScore: Number,
    culturalFitScore: Number,
    behavioralScore: Number,
    videoScore: Number,
    audioScore: Number,
    strengths: [String],
    improvements: [String],
    insights: String,
    recommendation: String,
    behavioralInsights: {
      eyeContact: String,
      confidence: String,
      engagement: String
    },
    proctoring: {
      tabSwitches: Number,
      appSwitches: Number,
      totalSwitches: Number,
      proctoringScore: Number,
      riskLevel: String
    },
    integrityWarning: String
  },
  completedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MockInterview', mockInterviewSchema);
