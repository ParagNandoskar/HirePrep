const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  requirements: {
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
      isRequired: {
        type: Boolean,
        default: true
      },
      weight: {
        type: Number,
        min: 1,
        max: 10,
        default: 5
      }
    }],
    education: {
      minimumLevel: {
        type: String,
        enum: ['High School', 'Associate', 'Bachelor', 'Master', 'PhD'],
        default: 'Bachelor'
      },
      fieldOfStudy: [String],
      isRequired: {
        type: Boolean,
        default: true
      }
    },
    experience: {
      minimumYears: {
        type: Number,
        min: 0,
        default: 0
      },
      maximumYears: Number,
      specificIndustry: [String],
      specificRoles: [String]
    },
    certifications: [{
      name: String,
      isRequired: {
        type: Boolean,
        default: false
      }
    }],
    languages: [{
      language: String,
      proficiency: {
        type: String,
        enum: ['Basic', 'Conversational', 'Fluent', 'Native'],
        default: 'Conversational'
      }
    }]
  },
  jobDetails: {
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
      required: true
    },
    level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'executive'],
      required: true
    },
    department: String,
    reportingTo: String,
    teamSize: Number
  },
  compensation: {
    salaryRange: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    benefits: [String],
    equity: Boolean,
    bonus: {
      type: String,
      enum: ['None', 'Annual', 'Performance-based', 'Quarterly']
    }
  },
  location: {
    type: {
      type: String,
      enum: ['remote', 'on-site', 'hybrid'],
      required: true
    },
    city: String,
    state: String,
    country: String,
    timezone: String,
    remotePolicy: String
  },
  applicationProcess: {
    steps: [{
      step: String,
      description: String,
      estimatedDuration: String
    }],
    applicationDeadline: Date,
    expectedStartDate: Date,
    contactPerson: String,
    additionalInstructions: String
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'filled'],
    default: 'draft'
  },
  postedDate: {
    type: Date,
    default: Date.now
  },
  applications: [{
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
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
    notes: String,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewDate: Date
  }],
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    shortlisted: {
      type: Number,
      default: 0
    },
    hired: {
      type: Number,
      default: 0
    }
  },
  nlpKeywords: [String], // Extracted keywords for matching
  searchVector: String // For full-text search
}, {
  timestamps: true
});

// Indexes for search and performance
jobSchema.index({ title: 'text', description: 'text' });
jobSchema.index({ 'requirements.skills.name': 1 });
jobSchema.index({ 'location.city': 1, 'location.state': 1 });
jobSchema.index({ status: 1, postedDate: -1 });
jobSchema.index({ company: 1, status: 1 });

// Pre-save middleware to extract keywords
jobSchema.pre('save', function(next) {
  if (this.isModified('description') || this.isModified('requirements')) {
    // Extract keywords from description and requirements
    const text = `${this.title} ${this.description} ${this.requirements.skills.map(s => s.name).join(' ')}`;
    this.nlpKeywords = text.toLowerCase().match(/\b\w+\b/g) || [];
    this.searchVector = text.toLowerCase();
  }
  next();
});

module.exports = mongoose.model('Job', jobSchema);
