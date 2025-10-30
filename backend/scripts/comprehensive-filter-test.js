const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function testJobFilters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    // Find test user
    const user = await User.findOne({ email: 'test@gmail.com' });
    if (!user) {
      console.log('❌ Test user not found');
      process.exit(1);
    }
    
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    const fetch = (await import('node-fetch')).default;
    
    console.log('\n🧪 TESTING JOB FILTERS\n');
    console.log('='.repeat(50));
    
    // Test cases for different filters
    const testCases = [
      {
        name: 'All Jobs (No Filters)',
        endpoint: '/jobs',
        params: {}
      },
      {
        name: 'Filter by Job Type (full-time)',
        endpoint: '/jobs',
        params: { type: 'full-time' }
      },
      {
        name: 'Filter by Experience Level (senior)',
        endpoint: '/jobs',
        params: { level: 'senior' }
      },
      {
        name: 'Filter by Location (San Francisco)',
        endpoint: '/jobs',
        params: { location: 'San Francisco' }
      },
      {
        name: 'Filter by Work Mode (remote)',
        endpoint: '/jobs',
        params: { remote: 'true' }
      },
      {
        name: 'Filter by Work Mode (hybrid)',
        endpoint: '/jobs',
        params: { workMode: 'hybrid' }
      },
      {
        name: 'Filter by Skills (JavaScript)',
        endpoint: '/jobs',
        params: { skills: 'JavaScript' }
      },
      {
        name: 'Filter by Skills (React,Node.js)',
        endpoint: '/jobs',
        params: { skills: 'React,Node.js' }
      },
      {
        name: 'Filter by Salary Range (Min 80000)',
        endpoint: '/jobs',
        params: { minSalary: '80000' }
      },
      {
        name: 'Filter by Salary Range (Max 150000)',
        endpoint: '/jobs',
        params: { maxSalary: '150000' }
      },
      {
        name: 'Filter by Salary Range (80000-150000)',
        endpoint: '/jobs',
        params: { minSalary: '80000', maxSalary: '150000' }
      },
      {
        name: 'Search by Keyword (Developer)',
        endpoint: '/jobs',
        params: { keyword: 'Developer' }
      },
      {
        name: 'Combined Filters (JavaScript + Remote + Senior)',
        endpoint: '/jobs',
        params: { skills: 'JavaScript', remote: 'true', level: 'senior' }
      },
      {
        name: 'Matched Jobs (Basic Skill Matching)',
        endpoint: '/jobs/matched',
        params: {}
      },
      {
        name: 'Enhanced Matched Jobs (AI Matching)',
        endpoint: '/jobs/enhanced-matched',
        params: {}
      },
      {
        name: 'Matched Jobs with Additional Filters',
        endpoint: '/jobs/matched',
        params: { type: 'full-time', location: 'San Francisco' }
      }
    ];
    
    // Run each test case
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: ${testCase.name}`);
      console.log('-'.repeat(40));
      
      try {
        // Build query string
        const queryString = new URLSearchParams(testCase.params).toString();
        const url = `http://localhost:5000/api${testCase.endpoint}${queryString ? `?${queryString}` : ''}`;
        
        console.log(`📡 URL: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const jobCount = data.data?.jobs?.length || data.jobs?.length || 0;
          const total = data.data?.pagination?.total || data.pagination?.total || jobCount;
          
          console.log(`✅ Status: ${response.status}`);
          console.log(`📊 Results: ${jobCount} jobs returned (Total: ${total})`);
          
          // Show job titles for verification
          const jobs = data.data?.jobs || data.jobs || [];
          if (jobs.length > 0) {
            console.log('📋 Job Titles:');
            jobs.forEach((job, index) => {
              const matchScore = job.matchScore ? ` (Match: ${job.matchScore}%)` : '';
              const location = job.location?.city || job.location?.type || 'Unknown';
              const salary = job.compensation?.salaryRange ? 
                `$${job.compensation.salaryRange.min}-${job.compensation.salaryRange.max}` : 'N/A';
              console.log(`   ${index + 1}. ${job.title}${matchScore} - ${location} - ${salary}`);
            });
          }
          
          // Additional validation for specific filters
          if (testCase.params.type) {
            const invalidJobs = jobs.filter(job => job.jobDetails?.type !== testCase.params.type);
            if (invalidJobs.length > 0) {
              console.log(`⚠️  Warning: ${invalidJobs.length} jobs don't match type filter`);
            }
          }
          
          if (testCase.params.level) {
            const invalidJobs = jobs.filter(job => job.jobDetails?.level !== testCase.params.level);
            if (invalidJobs.length > 0) {
              console.log(`⚠️  Warning: ${invalidJobs.length} jobs don't match level filter`);
            }
          }
          
          if (testCase.params.skills) {
            const searchSkills = testCase.params.skills.toLowerCase().split(',');
            const jobsWithoutSkills = jobs.filter(job => {
              const jobSkills = job.requirements?.skills?.map(s => (s.name || s).toLowerCase()) || [];
              return !searchSkills.some(searchSkill => 
                jobSkills.some(jobSkill => jobSkill.includes(searchSkill.trim()))
              );
            });
            if (jobsWithoutSkills.length > 0) {
              console.log(`⚠️  Warning: ${jobsWithoutSkills.length} jobs don't match skills filter`);
            }
          }
          
        } else {
          console.log(`❌ Status: ${response.status}`);
          console.log(`❌ Error: ${data.message || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.log(`❌ Network Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Filter testing completed!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Error:', err);
    process.exit(1);
  }
}

testJobFilters();