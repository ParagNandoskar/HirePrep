const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Application Status
  status: {
    type: String,
    enum: [
      'applied',           // Just submitted
      'under-review',      // HR is reviewing
      'screening',         // Initial screening call
      'assessment',        // Technical/skill assessment
      'interview-scheduled', // Interview scheduled
      'interviewing',      // In interview process
      'interviewed',       // Interview completed
      'final-round',       // Final interview round
      'decision-pending',  // Waiting for final decision
      'offer-extended',    // Offer made
      'offer-accepted',    // Candidate accepted
      'offer-declined',    // Candidate declined
      'hired',             // Successfully hired
      'rejected',          // Application rejected
      'withdrawn'          // Candidate withdrew
    ],
    default: 'applied'
  },
  
  // Application Details
  appliedAt: {
    type: Date,
    default: Date.now
  },
  
  // Cover letter and additional info
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  
  // Custom questions answers
  questionsAnswers: [{
    question: String,
    answer: String,
    required: Boolean
  }],
  
  // Attachments (additional documents)
  attachments: [{
    name: String,
    url: String,
    type: {
      type: String,
      enum: ['resume', 'portfolio', 'certificate', 'other']
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // AI-Generated Match Score
  matchScore: {
    overall: {
      type: Number,
      min: 0,
      max: 100
    },
    breakdown: {
      skills: Number,
      experience: Number,
      education: Number,
      location: Number
    },
    skillsMatched: [String],
    skillsGap: [String],
    recommendations: [String]
  },
  
  // Interview Process
  interviews: [{
    type: {
      type: String,
      enum: ['phone', 'video', 'in-person', 'technical', 'behavioral', 'case-study']
    },
    scheduledAt: Date,
    duration: Number, // in minutes
    interviewer: {
      name: String,
      email: String,
      designation: String
    },
    location: String, // for in-person interviews
    meetingLink: String, // for video interviews
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String,
      strengths: [String],
      improvements: [String],
      recommendation: {
        type: String,
        enum: ['hire', 'maybe', 'no-hire']
      }
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Screening Interview Fields
  interviewCompleted: {
    type: Boolean,
    default: false
  },
  interviewCompletedAt: {
    type: Date
  },
  interviewStatus: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  interviewScore: {
    type: Number,
    min: 0,
    max: 100
  },
  screeningScore: {
    type: Number,
    min: 0,
    max: 100
  },
  questionsAnswered: {
    type: Number,
    default: 0
  },
  interviewTranscript: [{
    type: {
      type: String,
      enum: ['question', 'answer']
    },
    content: String,
    timestamp: Date,
    questionNumber: Number
  }],
  aiAnalysis: {
    scores: {
      overall: Number,
      content: Number,
      behavioral: Number,
      video: Number,
      audio: Number,
      communication: Number,
      technical: Number,
      problemSolving: Number,
      culturalFit: Number
    },
    strengths: [String],
    improvements: [String],
    insights: String,
    behavioralInsights: {
      eyeContact: String,
      confidence: String,
      engagement: String
    },
    proctoring: {
      tabSwitches: {
        type: Number,
        default: 0
      },
      appSwitches: {
        type: Number,
        default: 0
      },
      totalSwitches: {
        type: Number,
        default: 0
      },
      proctoringScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
      },
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low'
      }
    },
    recommendation: String,
    integrityWarning: String,
    questionsAnswered: Number
  },
  
  // Comprehensive AI-Generated Detailed Feedback
  detailedFeedback: {
    summary: String, // Executive summary of interview performance
    detailedAnalysis: String, // In-depth analysis of responses
    skillBreakdown: {
      communication: {
        score: Number,
        feedback: String,
        whyItMatters: String,
        howToImprove: [String]
      },
      technical: {
        score: Number,
        feedback: String,
        whyItMatters: String,
        howToImprove: [String]
      },
      problemSolving: {
        score: Number,
        feedback: String,
        whyItMatters: String,
        howToImprove: [String]
      },
      confidence: {
        score: Number,
        feedback: String,
        whyItMatters: String,
        howToImprove: [String]
      }
    },
    proTips: [String],
    finalRecommendation: String,
    generatedAt: Date
  },
  
  // Assessment Results
  assessments: [{
    type: {
      type: String,
      enum: ['coding', 'aptitude', 'personality', 'technical', 'case-study']
    },
    title: String,
    score: Number,
    maxScore: Number,
    percentage: Number,
    completedAt: Date,
    timeSpent: Number, // in minutes
    details: mongoose.Schema.Types.Mixed // Flexible field for assessment-specific data
  }],
  
  // Communication Log
  communications: [{
    type: {
      type: String,
      enum: ['email', 'call', 'message', 'note']
    },
    subject: String,
    content: String,
    sentBy: {
      type: String,
      enum: ['candidate', 'company', 'system']
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    isRead: {
      type: Boolean,
      default: false
    }
  }],
  
  // Offer Details (if offer extended)
  offer: {
    position: String,
    salary: {
      amount: Number,
      currency: {
        type: String,
        default: 'INR'
      },
      period: {
        type: String,
        enum: ['hourly', 'monthly', 'yearly'],
        default: 'yearly'
      }
    },
    benefits: [String],
    startDate: Date,
    location: String,
    workMode: {
      type: String,
      enum: ['remote', 'hybrid', 'on-site']
    },
    offerExpiry: Date,
    negotiable: {
      type: Boolean,
      default: false
    },
    offerLetter: String, // URL to offer letter document
    extendedAt: Date,
    respondedAt: Date,
    response: {
      type: String,
      enum: ['accepted', 'declined', 'negotiating']
    },
    negotiationNotes: String
  },
  
  // Rejection Details
  rejection: {
    reason: {
      type: String,
      enum: [
        'not-qualified',
        'overqualified', 
        'experience-mismatch',
        'skill-gap',
        'culture-fit',
        'position-filled',
        'budget-constraints',
        'other'
      ]
    },
    feedback: String,
    rejectedAt: Date,
    rejectedBy: String
  },
  
  // Timeline tracking
  timeline: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: String,
    notes: String
  }],
  
  // Application source
  source: {
    type: String,
    enum: ['direct', 'referral', 'job-board', 'social-media', 'company-website'],
    default: 'direct'
  },
  
  // Referral information
  referral: {
    referrerName: String,
    referrerEmail: String,
    referrerRelation: String,
    referralCode: String
  },
  
  // System fields
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Analytics
  views: {
    byCompany: {
      type: Number,
      default: 0
    },
    lastViewedAt: Date
  },
  
  // Notifications
  notifications: {
    candidate: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    company: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true
});

// Compound indexes for better performance
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true }); // Prevent duplicate applications
applicationSchema.index({ candidateId: 1, status: 1 });
applicationSchema.index({ jobId: 1, status: 1 });
applicationSchema.index({ companyId: 1, status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ 'matchScore.overall': -1 });
applicationSchema.index({ status: 1, appliedAt: -1 });

// Add to timeline when status changes
applicationSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.timeline.push({
      status: this.status,
      changedAt: new Date(),
      changedBy: 'system' // This could be set by the calling code
    });
  }
  next();
});

// Static method to get application statistics
applicationSchema.statics.getApplicationStats = async function(filter = {}) {
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ];
  
  const stats = await this.aggregate(pipeline);
  
  // Convert to object for easier access
  const statsObj = stats.reduce((acc, stat) => {
    acc[stat._id] = stat.count;
    return acc;
  }, {});
  
  return statsObj;
};

// Method to calculate application age in days
applicationSchema.virtual('applicationAge').get(function() {
  const now = new Date();
  const applied = new Date(this.appliedAt);
  return Math.ceil((now - applied) / (1000 * 60 * 60 * 24));
});

// Method to get current interview
applicationSchema.virtual('currentInterview').get(function() {
  if (!this.interviews || this.interviews.length === 0) return null;
  
  return this.interviews
    .filter(interview => interview.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
});

// Ensure virtual fields are serialized
applicationSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema);