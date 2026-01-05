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
  
  // Requirements structure to match frontend
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
        default: 5,
        min: 1,
        max: 10
      }
    }],
    education: {
      minimumLevel: {
        type: String,
        enum: ['High School', 'Associate', 'Bachelor', 'Master', 'Doctorate'],
        default: 'Bachelor'
      },
      field: String,
      isRequired: {
        type: Boolean,
        default: false
      }
    },
    experience: {
      minimumYears: {
        type: Number,
        default: 0
      },
      maximumYears: Number,
      industries: [String]
    },
    languages: [{
      name: String,
      proficiency: {
        type: String,
        enum: ['Basic', 'Conversational', 'Professional', 'Native']
      }
    }]
  },
  
  // Additional requirements as array
  additionalRequirements: [String],
  
  // Job details structure to match frontend
  jobDetails: {
    type: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
      default: 'full-time'
    },
    level: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
      default: 'mid'
    },
    department: String,
    team: String
  },
  
  // Location structure to match frontend
  location: {
    type: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site'],
      default: 'on-site'
    },
    city: String,
    state: String,
    country: {
      type: String,
      default: 'United States'
    },
    address: String,
    pincode: String
  },
  
  // Compensation structure to match frontend
  compensation: {
    salaryRange: {
      min: {
        type: Number,
        default: 0
      },
      max: {
        type: Number,
        default: 0
      },
      currency: {
        type: String,
        default: 'USD'
      }
    },
    period: {
      type: String,
      enum: ['hourly', 'monthly', 'yearly'],
      default: 'yearly'
    },
    benefits: [String],
    bonuses: {
      performance: Boolean,
      signing: Boolean,
      annual: Boolean
    },
    equity: {
      offered: Boolean,
      percentage: Number
    }
  },
  
  // Application process
  applicationProcess: {
    applicationDeadline: Date,
    expectedHires: {
      type: Number,
      default: 1
    },
    applicationMethod: {
      type: String,
      enum: ['platform', 'email', 'website'],
      default: 'platform'
    },
    customQuestions: [{
      question: String,
      type: {
        type: String,
        enum: ['text', 'textarea', 'select', 'multiselect', 'file']
      },
      options: [String], // for select/multiselect
      required: Boolean
    }]
  },
  
  // Screening Interview Questions
  interviewQuestions: [{
    question: {
      type: String,
      required: true
    },
    expectedAnswer: String,
    timeLimit: {
      type: Number, // in minutes
      default: 2,
      min: 1,
      max: 10
    }
  }],
  
  // Job status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'expired'],
    default: 'active'
  },
  
  // Posted date
  postedDate: {
    type: Date,
    default: Date.now
  },
  
  // Company reference for population
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  // SEO and categorization
  tags: [String],
  category: String,
  subCategory: String,
  
  // AI/ML fields
  embedding: [Number], // For job matching
  
  // Analytics and stats
  stats: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    qualified: {
      type: Number,
      default: 0
    },
    interviewed: {
      type: Number,
      default: 0
    },
    hired: {
      type: Number,
      default: 0
    }
  },
  
  // Featured/Priority
  isPremium: {
    type: Boolean,
    default: false
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Automation
  autoReject: {
    enabled: Boolean,
    criteria: {
      minimumScore: Number,
      skillsRequired: Number
    }
  },
  
  // Visibility
  isPublic: {
    type: Boolean,
    default: true
  },
  
  // Applications count for easy access
  applicationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better search and matching performance
jobSchema.index({ companyId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ 'requirements.skills.name': 1 });
jobSchema.index({ 'jobDetails.type': 1 });
jobSchema.index({ 'jobDetails.level': 1 });
jobSchema.index({ 'location.type': 1 });
jobSchema.index({ 'location.city': 1, 'location.state': 1 });
jobSchema.index({ tags: 1 });
jobSchema.index({ postedDate: -1 });
jobSchema.index({ 'compensation.salaryRange.min': 1, 'compensation.salaryRange.max': 1 });
jobSchema.index({ 'stats.applications': -1 });
jobSchema.index({ isPremium: -1, isFeatured: -1, postedDate: -1 });

// Text search index
jobSchema.index({
  title: 'text',
  description: 'text',
  'requirements.skills.name': 'text',
  tags: 'text'
});

// Virtual for getting applications
jobSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'jobId'
});

// Method to update application count
jobSchema.methods.updateApplicationCount = async function() {
  const Application = mongoose.model('Application');
  const count = await Application.countDocuments({ jobId: this._id });
  this.applicationsCount = count;
  this.stats.applications = count;
  await this.save();
};

// Method to increment view count
jobSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Ensure virtual fields are serialized
jobSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
