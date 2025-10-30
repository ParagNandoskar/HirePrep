const mongoose = require('mongoose');
require('dotenv').config();

async function checkCandidateProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const candidatesCollection = db.collection('candidates');
    const usersCollection = db.collection('users');

    // Find the test user
    const testUser = await usersCollection.findOne({ email: 'testuser@example.com' });
    console.log('🔍 Test user found:', {
      id: testUser?._id,
      name: testUser?.name,
      email: testUser?.email,
      role: testUser?.role
    });

    if (testUser) {
      // Find candidate profile for this user
      const candidate = await candidatesCollection.findOne({ userId: testUser._id });
      console.log('🔍 Candidate profile found:', !!candidate);
      
      if (candidate) {
        console.log('📋 Candidate details:', {
          id: candidate._id,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          email: candidate.email,
          skillsCount: candidate.skills?.length || 0,
          skills: candidate.skills
        });
      } else {
        console.log('❌ No candidate profile found for user');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkCandidateProfile();