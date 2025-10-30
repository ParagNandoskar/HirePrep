const mongoose = require('mongoose');
const User = require('../src/models/User');
const Candidate = require('../src/models/Candidate');
require('dotenv').config();

async function checkTestUserProfile() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the test user
    const user = await User.findOne({ email: 'test@gmail.com' });
    if (!user) {
      console.log('❌ Test user not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    });
    
    // Find candidate profile
    const candidate = await Candidate.findOne({ userId: user._id });
    if (!candidate) {
      console.log('❌ Candidate profile not found');
    } else {
      console.log('✅ Candidate profile found:', {
        id: candidate._id,
        skills: candidate.skills,
        experience: candidate.experience,
        education: candidate.education
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkTestUserProfile();