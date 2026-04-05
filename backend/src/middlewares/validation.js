const Joi = require('joi');
const { errorResponse } = require('../utils/helpers');

/**
 * Validation Middleware Factory
 * Validates request body against provided Joi schema
 * Returns detailed error information for client
 * @param {JoiSchema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Collect all errors, not just first one
      stripUnknown: true, // Remove unknown fields for security
      context: req, // Pass request context for conditional validation
    });

    if (error) {
      // Format validation errors for client
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      // Log validation failures for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.warn('❌ Validation failed for', req.path, validationErrors);
      }

      return errorResponse(
        res,
        'Request validation failed',
        400,
        { errors: validationErrors }
      );
    }

    // Attach validated data to request for controller use
    req.validated = value;
    next();
  };
};

// User registration validation
const registerValidation = Joi.object({
  // Support both formats for backward compatibility
  name: Joi.string().trim().min(2).max(100).optional().allow(''),
  firstName: Joi.string().trim().min(1).max(50).optional().allow(''),
  lastName: Joi.string().trim().max(50).optional().allow(''),
  
  // Email validation - normalized, required
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  // Password validation - required, min 6 chars
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'any.required': 'Password is required',
    }),
  
  // Role validation - must be one of specified values
  role: Joi.string()
    .valid('student', 'company', 'candidate', 'employer')
    .required()
    .messages({
      'any.only': 'Role must be one of: candidate, employer, student, or company',
      'any.required': 'Role is required',
    }),
  
  // Profile - conditional validation based on role
  profile: Joi.object().when('role', {
    is: Joi.string().valid('student', 'candidate'),
    then: Joi.object({
      university: Joi.string().max(100).optional(),
      degree: Joi.string().max(100).optional(),
      graduationYear: Joi.number().integer().min(1900).max(2030).optional(),
      phone: Joi.string().pattern(/^[+\d\s-()]+$/).optional().allow('')
    }),
    otherwise: Joi.object({
      companyName: Joi.string().max(100).optional(),
      companySize: Joi.string().max(50).optional(),
      industry: Joi.string().max(100).optional(),
      website: Joi.string().uri().optional().allow(''),
      description: Joi.string().max(1000).optional()
    })
  }).optional()
})
  .custom((value, helpers) => {
    // Ensure either name or firstName is provided
    if (!value.name && !value.firstName) {
      return helpers.error('any.custom', {
        message: 'Either "name" or "firstName" must be provided'
      });
    }
    return value;
  })
  .messages({
    'object.unknown': 'Unknown field in request body is not allowed',
  });

// User login validation
const loginValidation = Joi.object({
  // Email validation
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  // Password validation - required
  password: Joi.string()
    .required()
    .max(128)
    .messages({
      'any.required': 'Password is required',
    }),
})
  .strict(); // Don't allow unknown fields

// Google OAuth validation
const googleAuthValidation = Joi.object({
  idToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Google ID token is required',
    }),
  role: Joi.string()
    .valid('student', 'company', 'candidate', 'employer')
    .optional(),
  mode: Joi.string()
    .valid('login', 'signup')
    .required()
    .messages({
      'any.only': 'Mode must be either login or signup',
      'any.required': 'Mode is required',
    }),
  profile: Joi.object().unknown(true).optional(),
})
  .strict();

// Profile update validation
const updateProfileValidation = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  firstName: Joi.string().trim().min(1).max(50).optional(),
  lastName: Joi.string().trim().max(50).optional(),
  avatar: Joi.string().uri().optional().allow(''),
  phone: Joi.string().pattern(/^[+\d\s-()]*$/).optional().allow(''),
  profile: Joi.object().unknown(true).optional(),
})
  .min(1) // At least one field must be provided
  .messages({
    'object.min': 'At least one field must be provided for update',
  });

// Change password validation
const changePasswordValidation = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required',
    }),
  
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password must not exceed 128 characters',
      'any.required': 'New password is required',
    })
    .external(async (value, helpers) => {
      // Ensure password is not too similar to current
      if (value && helpers.prefs.context) {
        const currentPassword = helpers.prefs.context.body?.currentPassword;
        if (currentPassword && value === currentPassword) {
          return helpers.error('any.invalid', {
            message: 'New password cannot be the same as current password'
          });
        }
      }
    }),
  
  confirmPassword: Joi.string()
    .required()
    .valid(Joi.ref('newPassword'))
    .messages({
      'any.only': 'Password confirmation must match new password',
      'any.required': 'Password confirmation is required',
    }),
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
  googleAuthValidation,
  updateProfileValidation,
  changePasswordValidation,
  jobValidation,
  interviewStartValidation,
  interviewAnalysisValidation,
  paginationValidation
};
