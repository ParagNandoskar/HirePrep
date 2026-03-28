const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const mongoose = require('mongoose');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/job');
const interviewRoutes = require('./routes/interview');
const leaderboardRoutes = require('./routes/leaderboard');
const statusRoutes = require('./routes/status');
const analysisRoutes = require('./routes/analysis');

// Import new routes for frontend compatibility
const candidatesRoutes = require('./routes/candidates');
const companiesRoutes = require('./routes/companies');
const applicationsRoutes = require('./routes/applications');
const jobsRoutes = require('./routes/jobs');
const uploadRoutes = require('./routes/upload');
const geminiVoiceRoutes = require('./routes/geminiVoice');
const videoAnalysisRoutes = require('./routes/videoAnalysis');
const paymentsRoutes = require('./routes/payments');

// Import middlewares
const { errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter, authLimiter, uploadLimiter, aiLimiter } = require('./middlewares/rateLimiter');

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet - Secure HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
      },
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  })
);

// Data sanitization - Prevent NoSQL injection
app.use(mongoSanitize());

// XSS protection
app.use(xssClean());

// ============================================
// CORS CONFIGURATION
// ============================================
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Parse CORS_ORIGIN from .env
    const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((o) => o.trim());

    // Allow any localhost/127.0.0.1 origins in development
    if (process.env.NODE_ENV !== 'production' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== 'production') {
      // Fallback for non-listed development origins
      callback(null, true);
    } else {
      // Production environment and origin not allowed
      callback(new Error(`Not allowed by CORS: ${origin}`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Last-Modified',
    'If-Modified-Since',
  ],
  exposedHeaders: ['X-Total-Count', 'Access-Control-Allow-Origin', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
};

// Apply CORS middleware
app.use(cors(corsOptions));

// ============================================
// BODY PARSING MIDDLEWARE
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// GLOBAL RATE LIMITING
// ============================================
// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// ============================================
// HEALTH CHECK ENDPOINTS
// ============================================
// Health check endpoint (simple)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'HirePrep Backend API is running!',
    timestamp: new Date().toISOString(),
  });
});

// COMBINED Test endpoint for CORS and general debugging
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running and CORS is verified!',
    origin: req.headers.origin,
    cors: 'working',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint with DB status
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: {
      connected: mongoose.connection.readyState === 1,
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    },
  });
});

// ============================================
// API ROUTES WITH SPECIFIC RATE LIMITERS
// ============================================
// Authentication routes - stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// Resume routes - upload limiter for resume endpoints
app.use('/api/resume', uploadLimiter, resumeRoutes);
app.use('/api/resumes', uploadLimiter, resumeRoutes);

// Job routes - standard rate limiting
app.use('/api/job', jobRoutes);
app.use('/api/jobs', jobsRoutes);

// Interview routes - AI limiter for interview endpoints
app.use('/api/interview', aiLimiter, interviewRoutes);

// Other routes - standard rate limiting (already applied globally, but explicit for clarity)
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/analysis', analysisRoutes);

// New routes for frontend compatibility
app.use('/api/candidates', candidatesRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/gemini-voice', aiLimiter, geminiVoiceRoutes);
app.use('/api/video-analysis', aiLimiter, videoAnalysisRoutes);
app.use('/api/payments', paymentsRoutes);

// ============================================
// ERROR HANDLING
// ============================================
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
