const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  website: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  
  // Company Details
  industry: {
    type: String,
    required: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    required: true
  },
  foundedYear: {
    type: Number
  },
  companyType: {
    type: String,
    enum: ['startup', 'private', 'public', 'non-profit', 'government'],
    default: 'private'
  },
  
  // Company Description
  description: {
    type: String,
    maxlength: 2000
  },
  mission: {
    type: String,
    maxlength: 500
  },
  vision: {
    type: String,
    maxlength: 500
  },
  values: [String],
  
  // Media
  logo: {
    type: String // URL to company logo
  },
  coverImage: {
    type: String // URL to cover image
  },
  images: [String], // Additional company images
  
  // Location
  headquarters: {
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  
  // Additional offices
  offices: [{
    name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    pincode: String,
    isHeadquarters: {
      type: Boolean,
      default: false
    }
  }],
  
  // Contact Information
  contactPerson: {
    name: String,
    email: String,
    phone: String,
    designation: String,
    experience: String // Added experience level for the contact person
  },
  
  // HR Information
  hrContact: {
    name: String,
    email: String,
    phone: String
  },
  
  // Social Links
  socialLinks: {
    linkedin: String,
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String,
    glassdoor: String
  },
  
  // Company Stats
  stats: {
    totalEmployees: Number,
    openPositions: {
      type: Number,
      default: 0
    },
    totalApplications: {
      type: Number,
      default: 0
    },
    hires: {
      type: Number,
      default: 0
    }
  },
  
  // Benefits offered
  benefits: [{
    category: {
      type: String,
      enum: ['health', 'financial', 'work-life', 'professional', 'perks']
    },
    title: String,
    description: String
  }],
  
  // Tech stack (for tech companies)
  techStack: {
    languages: [String],
    frameworks: [String],
    databases: [String],
    tools: [String],
    platforms: [String]
  },
  
  // Culture and work environment
  culture: {
    workEnvironment: {
      type: String,
      enum: ['formal', 'casual', 'flexible', 'startup-like']
    },
    workingHours: String,
    dresscode: {
      type: String,
      enum: ['formal', 'business-casual', 'casual', 'no-dress-code']
    },
    remotePolicy: {
      type: String,
      enum: ['no-remote', 'hybrid', 'remote-friendly', 'fully-remote']
    }
  },
  
  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDocuments: [{
    type: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Company rating and reviews
  rating: {
    overall: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    workLife: Number,
    culture: Number,
    compensation: Number,
    management: Number,
    careerGrowth: Number,
    totalReviews: {
      type: Number,
      default: 0
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
  subscriptionPlan: {
    type: String,
    enum: ['free', 'basic', 'premium', 'enterprise'],
    default: 'free'
  },
  subscriptionExpiry: Date,
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
companySchema.index({ userId: 1 });
companySchema.index({ email: 1 });
companySchema.index({ companyName: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ companySize: 1 });
companySchema.index({ 'headquarters.city': 1, 'headquarters.state': 1 });
companySchema.index({ isVerified: 1 });
companySchema.index({ profileCompleteness: -1 });
companySchema.index({ 'rating.overall': -1 });

// Calculate profile completeness before saving
companySchema.pre('save', function(next) {
  let completeness = 0;
  
  // Basic info (40%)
  if (this.companyName && this.email && this.industry && this.companySize) completeness += 40;
  
  // Description (20%)
  if (this.description) completeness += 20;
  
  // Logo (10%)
  if (this.logo) completeness += 10;
  
  // Contact information (10%)
  if (this.contactPerson && this.contactPerson.name && this.contactPerson.email) completeness += 10;
  
  // Location (10%)
  if (this.headquarters && this.headquarters.city && this.headquarters.state) completeness += 10;
  
  // Social links or website (10%)
  if (this.website || (this.socialLinks && (this.socialLinks.linkedin || this.socialLinks.facebook))) completeness += 10;
  
  this.profileCompleteness = Math.min(completeness, 100);
  next();
});

// Method to update stats
companySchema.methods.updateStats = async function() {
  const Job = mongoose.model('Job');
  const Application = mongoose.model('Application');
  
  try {
    // Count open positions
    const openPositions = await Job.countDocuments({ 
      companyId: this.userId,
      status: 'active'
    });
    
    // Count total applications
    const totalApplications = await Application.countDocuments({
      'job': { $in: await Job.find({ companyId: this.userId }).select('_id') }
    });
    
    // Count hires
    const hires = await Application.countDocuments({
      'job': { $in: await Job.find({ companyId: this.userId }).select('_id') },
      status: 'hired'
    });
    
    this.stats.openPositions = openPositions;
    this.stats.totalApplications = totalApplications;
    this.stats.hires = hires;
    
    await this.save();
  } catch (error) {
    console.error('Error updating company stats:', error);
  }
};

// Ensure virtual fields are serialized
companySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Company', companySchema);