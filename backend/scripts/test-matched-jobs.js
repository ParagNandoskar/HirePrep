const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function testMatchedJobsAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the test user
    const user = await User.findOne({ email: 'test@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    console.log('✅ User found:', user.email, 'with role:', user.role);
    
    // Generate a token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    console.log('🔑 Generated token for test user');
    
    // Test the matched jobs API
    const fetch = (await import('node-fetch')).default;
    
    console.log('🔍 Testing matched jobs endpoint...');
    const response = await fetch('http://localhost:5000/api/jobs/matched', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('📡 API Response Status:', response.status);
    console.log('📡 API Response:', JSON.stringify(data, null, 2));
    
    // Also test enhanced matched jobs
    console.log('\n🔍 Testing enhanced matched jobs endpoint...');
    const enhancedResponse = await fetch('http://localhost:5000/api/jobs/enhanced-matched', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const enhancedData = await enhancedResponse.json();
    console.log('📡 Enhanced API Response Status:', enhancedResponse.status);
    console.log('📡 Enhanced API Response:', JSON.stringify(enhancedData, null, 2));
    
    // Also test regular jobs endpoint for comparison
    console.log('\n🔍 Testing regular jobs endpoint...');
    const allJobsResponse = await fetch('http://localhost:5000/api/jobs', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const allJobsData = await allJobsResponse.json();
    console.log('📡 All Jobs API Response Status:', allJobsResponse.status);
    console.log('📡 Number of jobs found:', allJobsData.data?.jobs?.length || 0);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testMatchedJobsAPI();