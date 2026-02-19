const Joi = require('joi');
const { errorResponse } = require('../utils/helpers');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return errorResponse(res, `Validation Error: ${errors.join(', ')}`, 400);
    }
    
    next();
  };
};

// User registration validation
const registerValidation = Joi.object({
  // Support both formats for backward compatibility
  name: Joi.string().min(2).max(50).optional().allow(''),
  firstName: Joi.string().min(1).max(25).optional().allow(''),
  lastName: Joi.string().min(0).max(25).optional().allow(''),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('student', 'company', 'candidate', 'employer').required(),
  profile: Joi.object().when('role', {
    is: Joi.string().valid('student', 'candidate'),
    then: Joi.object({
      university: Joi.string().optional(),
      degree: Joi.string().optional(),
      graduationYear: Joi.number().integer().min(1900).max(2030).optional(),
      phone: Joi.string().optional()
    }),
    otherwise: Joi.object({
      companyName: Joi.string().optional(), // Made optional for flexibility
      companySize: Joi.string().optional(),
      industry: Joi.string().optional(),
      website: Joi.string().uri().optional(),
      description: Joi.string().max(1000).optional()
    })
  }).optional()
}).custom((value, helpers) => {
  // Ensure either name or firstName is provided (lastName can be empty)
  if (!value.name && !value.firstName) {
    return helpers.error('any.custom', { 
      message: 'Either "name" or "firstName" must be provided' 
    });
  }
  
  // If name is empty but firstName is provided, that's okay
  if (!value.name && value.firstName) {
    return value;
  }
  
  return value;
});

// User login validation
const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Job posting validation
const jobValidation = Joi.object({
  title: Joi.string().min(5).max(100).required(),
  description: Joi.string().min(20).max(5000).required(),
  requirements: Joi.object({
    skills: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      required: Joi.boolean().default(false),
      experience: Joi.string().valid('entry', 'mid', 'senior').optional()
    })).required(),
    education: Joi.object({
      degree: Joi.string().optional(),
      field: Joi.string().optional(),
      required: Joi.boolean().default(false)
    }).optional(),
    experience: Joi.object({
      minYears: Joi.number().integer().min(0).optional(),
      maxYears: Joi.number().integer().min(0).optional(),
      industries: Joi.array().items(Joi.string()).optional()
    }).optional(),
    location: Joi.object({
      type: Joi.string().optional(),
      remote: Joi.boolean().default(false),
      hybrid: Joi.boolean().default(false)
    }).optional()
  }).required(),
  compensation: Joi.object({
    salaryMin: Joi.number().positive().optional(),
    salaryMax: Joi.number().positive().optional(),
    currency: Joi.string().default('USD'),
    benefits: Joi.array().items(Joi.string()).optional()
  }).optional(),
  jobType: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').default('full-time'),
  applicationDeadline: Joi.date().greater('now').optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

// Interview start validation
const interviewStartValidation = Joi.object({
  jobId: Joi.string().hex().length(24).required(),
  type: Joi.string().valid('mock', 'live').default('mock'),
  duration: Joi.number().integer().min(10).max(120).default(30)
});

// Interview analysis validation
const interviewAnalysisValidation = Joi.object({
  interviewId: Joi.string().hex().length(24).required(),
  analysisType: Joi.string().valid('video', 'audio', 'qa').required(),
  data: Joi.object().required()
});

// Query parameter validation
const paginationValidation = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  jobValidation,
  interviewStartValidation,
  interviewAnalysisValidation,
  paginationValidation
};
