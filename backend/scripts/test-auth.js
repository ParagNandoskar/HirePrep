const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function testAuth() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the user
    const user = await User.findOne({ email: 'employee@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.email, 'with role:', user.role);
    
    // Generate a token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    console.log('🔑 Generated token:', token);
    
    // Test the token by making an API call
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:5000/api/jobs/company/my-jobs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response:', JSON.stringify(data, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testAuth();