const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./src/config/database');
const app = require('./src/app');

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
