const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
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
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  currentRole: {
    type: String,
    enum: ['Student', 'Fresh Graduate', 'Working Professional', 'Job Seeker'],
    default: 'Student'
  },
  profileSummary: {
    type: String,
    maxlength: 1000
  },
  profileImage: {
    type: String // URL to profile image
  },
  profileImageKey: {
    type: String // S3 key for profile image deletion
  },
  
  // Location
  location: {
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  
  // Skills with metadata
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
      default: 0
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['manual', 'resume-extracted', 'imported'],
      default: 'manual'
    }
  }],
  
  // Education
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
    isCurrent: {
      type: Boolean,
      default: false
    },
    grade: String,
    achievements: [String]
  }],
  
  // Work Experience
  experience: [{
    company: {
      type: String,
      required: true
    },
    position: {
      type: String,
      required: true
    },
    location: String,
    startDate: Date,
    endDate: Date,
    isCurrent: {
      type: Boolean,
      default: false
    },
    description: String,
    achievements: [String],
    skills: [String]
  }],
  
  // Projects
  projects: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    technologies: [String],
    startDate: Date,
    endDate: Date,
    projectUrl: String,
    githubUrl: String,
    images: [String]
  }],
  
  // Certifications
  certifications: [{
    name: {
      type: String,
      required: true
    },
    issuingOrganization: String,
    issueDate: Date,
    expirationDate: Date,
    credentialId: String,
    credentialUrl: String
  }],
  
  // Languages
  languages: [{
    name: {
      type: String,
      required: true
    },
    proficiency: {
      type: String,
      enum: ['Basic', 'Conversational', 'Professional', 'Native'],
      default: 'Conversational'
    }
  }],
  
  // Social Links
  socialLinks: {
    linkedin: String,
    github: String,
    portfolio: String,
    twitter: String,
    behance: String,
    dribbble: String
  },
  
  // Resume related
  resume: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume'
  },
  
  // Preferences
  jobPreferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance']
    }],
    workModes: [{
      type: String,
      enum: ['remote', 'hybrid', 'on-site']
    }],
    expectedSalary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'INR'
      }
    },
    preferredLocations: [String],
    industries: [String],
    companySize: {
      type: String,
      enum: ['startup', 'small', 'medium', 'large', 'enterprise']
    }
  },
  
  // Profile Status
  profileCompleteness: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
candidateSchema.index({ userId: 1 });
candidateSchema.index({ 'skills.name': 1 });
candidateSchema.index({ currentRole: 1 });
candidateSchema.index({ 'location.city': 1, 'location.state': 1 });
candidateSchema.index({ profileCompleteness: -1 });
candidateSchema.index({ lastActiveAt: -1 });

// Calculate profile completeness before saving
candidateSchema.pre('save', function(next) {
  let completeness = 0;
  
  // Basic info (30%)
  if (this.firstName && this.lastName && this.email && this.phone) completeness += 30;
  
  // Skills (20%)
  if (this.skills && this.skills.length > 0) completeness += 20;
  
  // Education (15%)
  if (this.education && this.education.length > 0) completeness += 15;
  
  // Experience or Projects (15%)
  if ((this.experience && this.experience.length > 0) || (this.projects && this.projects.length > 0)) completeness += 15;
  
  // Resume (10%)
  if (this.resume) completeness += 10;
  
  // Profile summary and image (10%)
  if (this.profileSummary && this.profileImage) completeness += 10;
  
  this.profileCompleteness = Math.min(completeness, 100);
  next();
});

// Method to get full name
candidateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get years of experience
candidateSchema.virtual('totalExperience').get(function() {
  if (!this.experience || this.experience.length === 0) return 0;
  
  return this.experience.reduce((total, exp) => {
    const startDate = new Date(exp.startDate);
    const endDate = exp.isCurrent ? new Date() : new Date(exp.endDate);
    const years = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    return total + Math.max(0, years);
  }, 0);
});

// Ensure virtual fields are serialized
candidateSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Candidate', candidateSchema);