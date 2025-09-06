const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  industry: {
    type: String,
    required: true
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    required: true
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid URL']
  },
  description: {
    type: String,
    maxlength: 1000
  },
  location: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  contactInfo: {
    phone: String,
    email: String,
    linkedIn: String
  },
  logo: {
    s3Key: String,
    s3Url: String,
    uploadDate: Date
  },
  hrContacts: [{
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: String,
    department: String,
    role: {
      type: String,
      default: 'HR Manager'
    }
  }],
  benefits: [String],
  culture: {
    values: [String],
    workEnvironment: String,
    diversity: String
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationDate: Date,
    verificationMethod: String,
    documents: [{
      name: String,
      s3Key: String,
      s3Url: String,
      uploadDate: Date
    }]
  }
}, {
  timestamps: true
});

// Indexes
companySchema.index({ companyName: 'text', industry: 'text' });
companySchema.index({ 'location.city': 1, 'location.state': 1 });

module.exports = mongoose.model('Company', companySchema);
