const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  location: {
    city: String,
    state: String,
    country: String
  },
  profileSummary: {
    type: String,
    maxlength: 500
  },
  skills: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      default: 'Intermediate'
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 50
    }
  }],
  education: [{
    institution: {
      type: String,
      required: true
    },
    degree: {
      type: String,
      required: true
    },
    fieldOfStudy: String,
    startDate: Date,
    endDate: Date,
    gpa: {
      type: Number,
      min: 0,
      max: 4
    },
    isCurrentlyStudying: {
      type: Boolean,
      default: false
    }
  }],
  experience: [{
    company: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    startDate: Date,
    endDate: Date,
    isCurrentJob: {
      type: Boolean,
      default: false
    },
    description: String,
    achievements: [String]
  }],
  certifications: [{
    name: {
      type: String,
      required: true
    },
    issuer: String,
    dateIssued: Date,
    expiryDate: Date,
    credentialId: String,
    url: String
  }],
  resume: {
    originalName: String,
    filename: String,
    mimeType: String,
    size: Number,
    localPath: String,
    s3Key: String,
    s3Url: String,
    uploadDate: Date,
    fileSize: Number,
    contentType: String,
    extractedData: {
      skills: [String],
      experience: [{
        company: String,
        position: String,
        duration: String,
        description: String
      }],
      education: [{
        institution: String,
        degree: String,
        year: String
      }],
      certifications: [String],
      contactInfo: {
        email: String,
        phone: String,
        location: String
      },
      summary: String
    },
    nlpScore: {
      type: Number,
      min: 0,
      max: 100
    },
    lastAnalyzed: Date
  },
  jobApplications: [{
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    appliedDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['applied', 'screening', 'shortlisted', 'interview', 'rejected', 'hired'],
      default: 'applied'
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100
    },
    notes: String
  }],
  preferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance']
    }],
    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    preferredLocations: [String],
    remoteWork: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
candidateSchema.index({ 'skills.name': 1 });
candidateSchema.index({ 'location.city': 1, 'location.state': 1 });
candidateSchema.index({ 'resume.nlpScore': -1 });

module.exports = mongoose.model('Candidate', candidateSchema);
