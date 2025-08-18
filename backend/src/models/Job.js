const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  requirements: {
    skills: [{
      name: String,
      required: Boolean,
      experience: String // entry, mid, senior
    }],
    education: {
      degree: String,
      field: String,
      required: Boolean
    },
    experience: {
      minYears: Number,
      maxYears: Number,
      industries: [String]
    },
    location: {
      type: String,
      remote: Boolean,
      hybrid: Boolean
    }
  },
  compensation: {
    salaryMin: Number,
    salaryMax: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    benefits: [String]
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    default: 'full-time'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'closed'],
    default: 'active'
  },
  applicationDeadline: Date,
  embedding: [Number], // Gemini embeddings for matching
  tags: [String], // For categorization
  applicants: [{
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    appliedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'reviewed', 'interviewed', 'rejected', 'hired'],
      default: 'applied'
    },
    matchScore: Number // AI-calculated match score
  }]
}, {
  timestamps: true
});

// Index for better search and matching performance
jobSchema.index({ companyId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ 'requirements.skills.name': 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ tags: 1 });

module.exports = mongoose.model('Job', jobSchema);
