const express = require('express');
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
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
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
