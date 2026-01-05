const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose'); // Moved mongoose require to the top
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/job');
const interviewRoutes = require('./routes/interview');
const leaderboardRoutes = require('./routes/leaderboard');
const statusRoutes = require('./routes/status');

// Import new routes for frontend compatibility
const candidatesRoutes = require('./routes/candidates');
const companiesRoutes = require('./routes/companies');
const applicationsRoutes = require('./routes/applications');
const jobsRoutes = require('./routes/jobs');
const uploadRoutes = require('./routes/upload');
const geminiVoiceRoutes = require('./routes/geminiVoice');

// Import middlewares
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Security middleware - Configure helmet for development
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "*"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "*"],
    },
  },
}));
app.use(compression());

// Rate limiting (increased for development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
});
app.use(limiter);

// CORS configuration - All console.logs removed for cleaner operation
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'https://localhost:3000',
      'https://localhost:5173',
    ];
    
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
    'If-Modified-Since'
  ],
  exposedHeaders: ['X-Total-Count', 'Access-Control-Allow-Origin'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Logging Middleware (Disabled for cleaner console)
app.use((req, res, next) => {
    // Explicit OPTIONS handling is usually unnecessary when using the 'cors' package 
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  
    next();
});

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads 
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (simple)
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'HirePrep Backend API is running!',
    timestamp: new Date().toISOString()
  });
});

// COMBINED Test endpoint for CORS and general debugging (console.log removed)
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running and CORS is verified!',
    origin: req.headers.origin,
    cors: 'working',
    timestamp: new Date().toISOString()
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
      status: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    }
  });
});

// Debug endpoint to check user details (temporary)
app.get('/api/debug/user/:userId', async (req, res) => {
  try {
    const User = require('./src/models/User');
    const { userId } = req.params;
    const user = await User.findById(userId).select('email name role');
    res.json({ success: true, user });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes); // Legacy route
app.use('/api/resumes', resumeRoutes); // Frontend expects /api/resumes
app.use('/api/job', jobRoutes); // Legacy route
app.use('/api/interview', interviewRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/status', statusRoutes);

// New routes for frontend compatibility
app.use('/api/candidates', candidatesRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/jobs', jobsRoutes); // Frontend expects /api/jobs
app.use('/api/upload', uploadRoutes); // Video and file uploads
app.use('/api/gemini-voice', geminiVoiceRoutes); // Gemini AI voice interview

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// Error handling middleware (should be last)
app.use(errorHandler);

module.exports = app;
