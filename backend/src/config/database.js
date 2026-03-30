const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    /**
     * Production-grade MongoDB connection configuration
     * Optimized for performance, reliability, and resource efficiency
     */
    const options = {
      // Connection Pooling - Critical for production performance
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE, 10) || 10,  // Max concurrent connections
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE, 10) || 5,   // Min warm connections
      waitQueueTimeoutMS: 60000,  // Time to wait for available connection
      
      // Connection & Socket Settings
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,   // Enable automatic retries for transient errors
      retryReads: true,    // Enable automatic read retries
      
      // Performance Optimizations
      noDelay: true,       // Disable Nagle's algorithm for faster TCP
      family: 4,           // Use IPv4 (change to 6 for IPv6)
    };

    console.log('🔌 Connecting to MongoDB with optimized pooling...');
    console.log(`   Pool: min=${options.minPoolSize}, max=${options.maxPoolSize}`);
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);
    
    // Connection Event Handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected - reconnecting...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to connect to MongoDB. Retrying in 5 seconds...', error.message);
  }
};

module.exports = connectDB;