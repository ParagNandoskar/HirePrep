const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Increased timeouts for stability on unstable networks
    const options = {
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      socketTimeoutMS: 60000, // Increased to 60 seconds
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    };

    // Removed connection attempt log to reduce console noise
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);    console.log('📄 MongoDB Connected:', conn.connection.host);
    
    // Connection Event Handlers (Minimal logging for cleaner console)
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      // Removed disconnected log to reduce console noise
    });

    mongoose.connection.on('reconnected', () => {
      // Removed reconnected log to reduce console noise
    });    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed. Exiting process.');
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB. Retrying in 5 seconds...', error.message);
    
    setTimeout(() => {
      connectDB();
    }, 5000); 
  }
};

module.exports = connectDB;