// Check what's stored in database
require('dotenv').config();
const mongoose = require('mongoose');
const Candidate = require('./src/models/Candidate');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    const candidate = await Candidate.findOne({ profileImage: { $exists: true, $ne: null } });
    
    if (candidate) {
      console.log('📸 Found candidate with profile image:');
      console.log('Profile Image URL:', candidate.profileImage);
      console.log('Profile Image Key:', candidate.profileImageKey);
      console.log('\n');
      
      // Extract region from URL
      if (candidate.profileImage.includes('amazonaws.com')) {
        const urlMatch = candidate.profileImage.match(/s3[.-]([a-z0-9-]+)\.amazonaws\.com/);
        if (urlMatch) {
          console.log('🌍 Detected Region from URL:', urlMatch[1]);
        }
      }
    } else {
      console.log('❌ No candidate with profile image found');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDB();
