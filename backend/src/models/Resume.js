const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String, // S3 URL (formerly Cloudinary URL)
    required: true
  },
  fileKey: {
    type: String, // S3 object key for deletion
    required: false // Optional for backward compatibility
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx'],
    required: true
  },
  parsedData: {
    personalInfo: {
      name: String,
      email: String,
      phone: String,
      address: String,
      linkedin: String,
      github: String,
      portfolio: String
    },
    summary: String,
    skills: [{
      name: String,
      category: String, // technical, soft, language, etc.
      proficiency: String // beginner, intermediate, advanced, expert
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: String,
      endDate: String,
      gpa: String,
      achievements: [String]
    }],
    experience: [{
      company: String,
      position: String,
      location: String,
      startDate: String,
      endDate: String,
      description: String,
      achievements: [String],
      skills: [String]
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String,
      githubUrl: String
    }],
    certifications: [{
      name: String,
      issuer: String,
      issueDate: String,
      expiryDate: String,
      credentialId: String
    }],
    languages: [{
      name: String,
      proficiency: String
    }]
  },
  aiAnalysis: {
    overallScore: Number, // 0-100
    skillsMatch: Object, // For job matching
    strengths: [String],
    improvements: [String],
    careerSuggestions: [String]
  },
  embedding: [Number], // Gemini embeddings for matching
  isProcessed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better search performance
resumeSchema.index({ userId: 1 });
resumeSchema.index({ 'parsedData.skills.name': 1 });
resumeSchema.index({ isProcessed: 1 });

module.exports = mongoose.model('Resume', resumeSchema);
