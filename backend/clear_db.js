const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing required environment variable: MONGODB_URI');
  process.exit(1);
}

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    
    console.log('Connected to MongoDB');
    console.log('Dropping all collections...');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('Collections found:', collectionNames);
    
    // Drop each collection
    for (const name of collectionNames) {
      await mongoose.connection.db.dropCollection(name);
      console.log(`✓ Dropped collection: ${name}`);
    }
    
    console.log('\n✅ Database cleared successfully!');
    
    // Display remaining collections
    const remainingCollections = await mongoose.connection.db.listCollections().toArray();
    console.log('Remaining collections:', remainingCollections.map(c => c.name));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    process.exit(1);
  }
}

clearDatabase();

