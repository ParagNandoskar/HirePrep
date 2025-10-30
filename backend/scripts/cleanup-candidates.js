const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupCandidatesCollection() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the candidates collection
    const db = mongoose.connection.db;
    const collection = db.collection('candidates');

    // List current indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop problematic indexes
    const indexesToDrop = ['user_1', 'email_1'];
    
    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Successfully dropped ${indexName} index`);
      } catch (error) {
        if (error.code === 27) {
          console.log(`ℹ️  ${indexName} index does not exist (already dropped)`);
        } else {
          console.log(`⚠️  Error dropping ${indexName} index:`, error.message);
        }
      }
    }

    // Remove documents with null or invalid user/userId fields
    console.log('\n🗑️  Cleaning up invalid candidate records...');
    
    // Remove records with null user field
    const deleteResult1 = await collection.deleteMany({ user: null });
    console.log(`✅ Deleted ${deleteResult1.deletedCount} records with null user field`);

    // Remove records with null userId field
    const deleteResult2 = await collection.deleteMany({ userId: null });
    console.log(`✅ Deleted ${deleteResult2.deletedCount} records with null userId field`);

    // Remove records with missing userId field
    const deleteResult3 = await collection.deleteMany({ userId: { $exists: false } });
    console.log(`✅ Deleted ${deleteResult3.deletedCount} records without userId field`);

    // Remove old 'user' field from all documents (if it exists)
    const updateResult = await collection.updateMany(
      { user: { $exists: true } },
      { $unset: { user: 1 } }
    );
    console.log(`✅ Removed 'user' field from ${updateResult.modifiedCount} documents`);

    // Find and handle duplicate userId records
    console.log('\n🔍 Checking for duplicate userId records...');
    const duplicates = await collection.aggregate([
      { $group: { _id: "$userId", count: { $sum: 1 }, docs: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (duplicates.length > 0) {
      console.log(`⚠️  Found ${duplicates.length} groups of duplicate userId records`);
      
      for (const duplicate of duplicates) {
        // Keep the first document, delete the rest
        const docsToDelete = duplicate.docs.slice(1);
        if (docsToDelete.length > 0) {
          await collection.deleteMany({ _id: { $in: docsToDelete } });
          console.log(`✅ Deleted ${docsToDelete.length} duplicate records for userId: ${duplicate._id}`);
        }
      }
    } else {
      console.log('✅ No duplicate userId records found');
    }

    // List final indexes
    console.log('\n📋 Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Show final document count
    const finalCount = await collection.countDocuments();
    console.log(`\n📊 Final candidate documents count: ${finalCount}`);

    console.log('\n✅ Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

cleanupCandidatesCollection();