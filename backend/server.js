const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const connectDB = require('./src/config/database');
const { loadSecrets } = require('./src/config/secrets');
const app = require('./src/app');
const path = require('path');

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start server with secrets loading
async function startServer() {
  try {
    // Load secrets from AWS Secrets Manager in production
    if (process.env.NODE_ENV === 'production' && process.env.USE_AWS_SECRETS === 'true') {
      console.log('🔐 Loading secrets from AWS Secrets Manager...');
      const secrets = await loadSecrets();
      
      if (secrets) {
        // Override environment variables with secrets
        process.env.JWT_SECRET = secrets.JWT_SECRET;
        process.env.JWT_REFRESH_SECRET = secrets.JWT_REFRESH_SECRET;
        process.env.MONGODB_URI = secrets.MONGODB_URI;
        process.env.GEMINI_API_KEY = secrets.GEMINI_API_KEY;
        process.env.AWS_ACCESS_KEY_ID = secrets.AWS_ACCESS_KEY_ID;
        process.env.AWS_SECRET_ACCESS_KEY = secrets.AWS_SECRET_ACCESS_KEY;
        process.env.REDIS_PASSWORD = secrets.REDIS_PASSWORD;
      }
    }

    // Connect to database
    await connectDB();
    
    const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      // In development, allow localhost on any port
      if (process.env.NODE_ENV !== 'production') {
        if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
          return callback(null, true);
        }
      }
      
      // Allow specific origins
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:5173", // Vite default port
        "http://localhost:3000", // React default port
        "http://localhost:8080", // Alternative port
      ];
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Socket.IO connection handling for real-time interview
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join interview room
  socket.on('joinInterview', (interviewId) => {
    socket.join(`interview_${interviewId}`);
    console.log(`User ${socket.id} joined interview ${interviewId}`);
  });

  // Handle real-time interview messages
  socket.on('interviewMessage', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('interviewMessage', data);
  });

  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('answer', data);
  });

  socket.on('ice-candidate', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('ice-candidate', data);
  });

  // Handle video/audio analysis data
  socket.on('analysisData', (data) => {
    socket.to(`interview_${data.interviewId}`).emit('analysisUpdate', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Security: ${process.env.USE_AWS_SECRETS === 'true' ? 'AWS Secrets Manager' : 'Environment Variables'}`);
});

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
