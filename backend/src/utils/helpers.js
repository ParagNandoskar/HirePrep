const multer = require('multer');
const path = require('path');

// Multer configuration for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Response formatter
const formatResponse = (success, data = null, message = '', statusCode = 200) => {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
    statusCode
  };
};

// Success response
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json(formatResponse(true, data, message, statusCode));
};

// Error response
const errorResponse = (res, message = 'Something went wrong', statusCode = 500, data = null) => {
  return res.status(statusCode).json(formatResponse(false, data, message, statusCode));
};

// Validate ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Generate random string
const generateRandomString = (length = 10) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Convert buffer to base64
const bufferToBase64 = (buffer) => {
  return buffer.toString('base64');
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Get file extension
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number
const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Calculate age from date
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Paginate results
const paginate = (query, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

// Format pagination response
const formatPaginationResponse = (data, page, limit, total) => {
  return {
    data,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      limit: parseInt(limit),
      total: parseInt(total),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
};

module.exports = {
  upload,
  formatResponse,
  successResponse,
  errorResponse,
  isValidObjectId,
  generateRandomString,
  bufferToBase64,
  sanitizeFilename,
  getFileExtension,
  isValidEmail,
  isValidPhone,
  calculateAge,
  paginate,
  formatPaginationResponse
};
