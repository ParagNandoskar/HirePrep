const { errorResponse } = require('../utils/helpers');

// Global error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return errorResponse(res, `Validation Error: ${errors.join(', ')}`, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, `${field} already exists`, 400);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return errorResponse(res, 'Invalid ID format', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'File too large. Maximum size is 10MB', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return errorResponse(res, 'Too many files or unexpected field name', 400);
  }

  // Body parser payload limit errors
  if (err.type === 'entity.too.large' || err.status === 413) {
    return errorResponse(
      res,
      'Request payload too large. Reduce media chunk size or send media in smaller chunks.',
      413
    );
  }

  // Custom application errors
  if (err.statusCode) {
    return errorResponse(res, err.message, err.statusCode);
  }

  // Default server error
  return errorResponse(res, 'Internal server error', 500);
};

// 404 handler
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
