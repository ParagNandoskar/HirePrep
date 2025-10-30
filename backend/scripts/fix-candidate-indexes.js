const mongoose = require('mongoose');
require('dotenv').config();

async function fixCandidateIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the candidates collection
    const db = mongoose.connection.db;
    const collection = db.collection('candidates');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Drop the email index if it exists
    try {
      await collection.dropIndex('email_1');
      console.log('✅ Successfully dropped email_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  email_1 index does not exist (already dropped)');
      } else {
        console.log('⚠️  Error dropping email_1 index:', error.message);
      }
    }

    // List indexes after dropping
    const indexesAfter = await collection.indexes();
    console.log('Indexes after cleanup:', indexesAfter.map(idx => ({ name: idx.name, key: idx.key })));

    console.log('✅ Index cleanup completed');
    
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixCandidateIndexes();