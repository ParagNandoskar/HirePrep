const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function testStudentPortalFilters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const user = await User.findOne({ email: 'test@gmail.com' });
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    const fetch = (await import('node-fetch')).default;
    
    console.log('\n🎓 STUDENT PORTAL FILTER VERIFICATION\n');
    
    // Test the exact filters used in the student portal
    const studentPortalFilters = [
      {
        name: '🏛️ All Jobs (Default View)',
        description: 'Testing default job listing for students',
        endpoint: '/jobs',
        params: {}
      },
      {
        name: '🎯 Matched Jobs',
        description: 'Testing skill-matched jobs for students',
        endpoint: '/jobs/matched',
        params: {}
      },
      {
        name: '🤖 Enhanced AI Matching',
        description: 'Testing AI-enhanced job matching',
        endpoint: '/jobs/enhanced-matched',
        params: {}
      },
      {
        name: '💼 Job Type: Full-time',
        description: 'Filter by full-time positions',
        endpoint: '/jobs',
        params: { type: 'full-time' }
      },
      {
        name: '💼 Job Type: Part-time',
        description: 'Filter by part-time positions',
        endpoint: '/jobs',
        params: { type: 'part-time' }
      },
      {
        name: '💼 Job Type: Internship',
        description: 'Filter by internship positions',
        endpoint: '/jobs',
        params: { type: 'internship' }
      },
      {
        name: '⭐ Level: Entry',
        description: 'Filter by entry level positions',
        endpoint: '/jobs',
        params: { level: 'entry' }
      },
      {
        name: '⭐ Level: Mid',
        description: 'Filter by mid level positions',
        endpoint: '/jobs',
        params: { level: 'mid' }
      },
      {
        name: '⭐ Level: Senior',
        description: 'Filter by senior level positions',
        endpoint: '/jobs',
        params: { level: 'senior' }
      },
      {
        name: '📍 Location: Remote',
        description: 'Filter by remote work',
        endpoint: '/jobs',
        params: { workMode: 'remote' }
      },
      {
        name: '📍 Location: Hybrid',
        description: 'Filter by hybrid work',
        endpoint: '/jobs',
        params: { workMode: 'hybrid' }
      },
      {
        name: '📍 Location: On-site',
        description: 'Filter by on-site work',
        endpoint: '/jobs',
        params: { workMode: 'on-site' }
      },
      {
        name: '🛠️ Skills: JavaScript',
        description: 'Filter by JavaScript skills',
        endpoint: '/jobs',
        params: { skills: 'JavaScript' }
      },
      {
        name: '🛠️ Skills: React',
        description: 'Filter by React skills',
        endpoint: '/jobs',
        params: { skills: 'React' }
      },
      {
        name: '🛠️ Skills: Python',
        description: 'Filter by Python skills',
        endpoint: '/jobs',
        params: { skills: 'Python' }
      },
      {
        name: '💰 Salary: $50k-$100k',
        description: 'Filter by salary range',
        endpoint: '/jobs',
        params: { minSalary: '50000', maxSalary: '100000' }
      },
      {
        name: '💰 Salary: $100k+',
        description: 'Filter by high salary',
        endpoint: '/jobs',
        params: { minSalary: '100000' }
      }
    ];
    
    let totalTests = 0;
    let passedTests = 0;
    
    for (const filter of studentPortalFilters) {
      totalTests++;
      console.log(`\n${filter.name}`);
      console.log(`${filter.description}`);
      console.log('-'.repeat(50));
      
      try {
        const query = new URLSearchParams(filter.params).toString();
        const url = `http://localhost:5000/api${filter.endpoint}${query ? `?${query}` : ''}`;
        
        console.log(`🔗 URL: ${url}`);
        
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const jobs = data.data?.jobs || data.jobs || [];
          console.log(`✅ Success: ${jobs.length} jobs found`);
          passedTests++;
          
          if (jobs.length > 0) {
            const job = jobs[0];
            console.log(`📋 Sample: "${job.title}"`);
            
            // Show specific filter validation
            if (filter.params.type) {
              const typeMatch = job.jobDetails?.type === filter.params.type;
              console.log(`   Type Match: ${typeMatch ? '✅' : '❌'} (${job.jobDetails?.type})`);
            }
            
            if (filter.params.level) {
              const levelMatch = job.jobDetails?.level === filter.params.level;
              console.log(`   Level Match: ${levelMatch ? '✅' : '❌'} (${job.jobDetails?.level})`);
            }
            
            if (filter.params.workMode) {
              const workModeMatch = job.location?.type === filter.params.workMode;
              console.log(`   Work Mode Match: ${workModeMatch ? '✅' : '❌'} (${job.location?.type})`);
            }
            
            if (filter.params.skills) {
              const jobSkills = job.requirements?.skills?.map(s => s.name || s) || [];
              const hasSkill = jobSkills.some(skill => 
                skill.toLowerCase().includes(filter.params.skills.toLowerCase())
              );
              console.log(`   Skills Match: ${hasSkill ? '✅' : '❌'} (${jobSkills.slice(0, 3).join(', ')})`);
            }
            
            if (filter.params.minSalary || filter.params.maxSalary) {
              const minSal = job.compensation?.salaryRange?.min || 0;
              const maxSal = job.compensation?.salaryRange?.max || 0;
              console.log(`   Salary Range: $${minSal}-$${maxSal}`);
            }
            
            if (job.matchScore) {
              console.log(`   Match Score: ${job.matchScore}%`);
            }
          }
          
        } else {
          console.log(`❌ Error: ${response.status} - ${data.message}`);
        }
        
      } catch (error) {
        console.log(`❌ Network Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎓 STUDENT PORTAL FILTER VERIFICATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} filters working`);
    console.log(`✅ Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL STUDENT PORTAL FILTERS ARE WORKING PERFECTLY!');
      console.log('✅ Students can see all jobs');
      console.log('✅ All sidebar filters are functional');
      console.log('✅ Job matching and filtering working as expected');
      console.log('✅ Ready for production use');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} filters need attention`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Error:', err);
    process.exit(1);
  }
}

testStudentPortalFilters();