const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function quickFilterTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Find test user
    const user = await User.findOne({ email: 'test@gmail.com' });
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    const fetch = (await import('node-fetch')).default;
    
    // Quick tests for critical filters
    const tests = [
      { name: 'All Jobs', params: {} },
      { name: 'Job Type Filter', params: { type: 'full-time' } },
      { name: 'Skills Filter', params: { skills: 'JavaScript' } },
      { name: 'Level Filter', params: { level: 'senior' } },
      { name: 'Location Filter', params: { location: 'San Francisco' } }
    ];
    
    for (const test of tests) {
      const query = new URLSearchParams(test.params).toString();
      const url = `http://localhost:5000/api/jobs${query ? `?${query}` : ''}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      const count = data.data?.jobs?.length || 0;
      
      console.log(`${test.name}: ${count} jobs found`);
      
      if (count > 0) {
        const job = data.data.jobs[0];
        console.log(`  Sample: "${job.title}" - ${job.jobDetails?.type || 'N/A'} - ${job.jobDetails?.level || 'N/A'}`);
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

quickFilterTest();