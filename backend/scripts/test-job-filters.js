const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function testJobFilters() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');
    
    // Find the test user
    const user = await User.findOne({ email: 'test@gmail.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }
    
    // Generate a token
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    const fetch = (await import('node-fetch')).default;
    
    console.log('🧪 TESTING JOB FILTERS FUNCTIONALITY\n');
    
    // Test 1: Basic job retrieval (no filters)
    console.log('1️⃣ Testing basic job retrieval...');
    const basicResponse = await fetch('http://localhost:5000/api/jobs', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const basicData = await basicResponse.json();
    console.log(`   ✅ Basic jobs: ${basicData.data?.jobs?.length || 0} jobs found\n`);
    
    // Test 2: Job type filter
    console.log('2️⃣ Testing job type filter (full-time)...');
    const typeResponse = await fetch('http://localhost:5000/api/jobs?type=full-time', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const typeData = await typeResponse.json();
    console.log(`   ✅ Full-time jobs: ${typeData.data?.jobs?.length || 0} jobs found`);
    if (typeData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample job type: ${typeData.data.jobs[0].jobDetails?.type}`);
    }
    console.log('');
    
    // Test 3: Experience level filter
    console.log('3️⃣ Testing experience level filter (senior)...');
    const levelResponse = await fetch('http://localhost:5000/api/jobs?level=senior', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const levelData = await levelResponse.json();
    console.log(`   ✅ Senior level jobs: ${levelData.data?.jobs?.length || 0} jobs found`);
    if (levelData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample job level: ${levelData.data.jobs[0].jobDetails?.level}`);
    }
    console.log('');
    
    // Test 4: Location filter
    console.log('4️⃣ Testing location filter (San Francisco)...');
    const locationResponse = await fetch('http://localhost:5000/api/jobs?location=San Francisco', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const locationData = await locationResponse.json();
    console.log(`   ✅ San Francisco jobs: ${locationData.data?.jobs?.length || 0} jobs found`);
    if (locationData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample location: ${locationData.data.jobs[0].location?.city}, ${locationData.data.jobs[0].location?.state}`);
    }
    console.log('');
    
    // Test 5: Remote work filter
    console.log('5️⃣ Testing remote work filter...');
    const remoteResponse = await fetch('http://localhost:5000/api/jobs?remote=true', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const remoteData = await remoteResponse.json();
    console.log(`   ✅ Remote jobs: ${remoteData.data?.jobs?.length || 0} jobs found`);
    if (remoteData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample work type: ${remoteData.data.jobs[0].location?.type}`);
    }
    console.log('');
    
    // Test 6: Salary range filter
    console.log('6️⃣ Testing salary range filter (min: 80000, max: 150000)...');
    const salaryResponse = await fetch('http://localhost:5000/api/jobs?minSalary=80000&maxSalary=150000', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const salaryData = await salaryResponse.json();
    console.log(`   ✅ Jobs in salary range: ${salaryData.data?.jobs?.length || 0} jobs found`);
    if (salaryData.data?.jobs?.length > 0) {
      const job = salaryData.data.jobs[0];
      console.log(`   📋 Sample salary: $${job.compensation?.salaryRange?.min}-$${job.compensation?.salaryRange?.max}`);
    }
    console.log('');
    
    // Test 7: Skills filter
    console.log('7️⃣ Testing skills filter (JavaScript)...');
    const skillsResponse = await fetch('http://localhost:5000/api/jobs?skills=JavaScript', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const skillsData = await skillsResponse.json();
    console.log(`   ✅ JavaScript jobs: ${skillsData.data?.jobs?.length || 0} jobs found`);
    if (skillsData.data?.jobs?.length > 0) {
      const skills = skillsData.data.jobs[0].requirements?.skills?.map(s => s.name) || [];
      console.log(`   📋 Sample skills: ${skills.slice(0, 3).join(', ')}`);
    }
    console.log('');
    
    // Test 8: Keyword search
    console.log('8️⃣ Testing keyword search (developer)...');
    const keywordResponse = await fetch('http://localhost:5000/api/jobs?keyword=developer', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const keywordData = await keywordResponse.json();
    console.log(`   ✅ Developer jobs: ${keywordData.data?.jobs?.length || 0} jobs found`);
    if (keywordData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample title: ${keywordData.data.jobs[0].title}`);
    }
    console.log('');
    
    // Test 9: Combined filters
    console.log('9️⃣ Testing combined filters (full-time + JavaScript + remote)...');
    const combinedResponse = await fetch('http://localhost:5000/api/jobs?type=full-time&skills=JavaScript&remote=true', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const combinedData = await combinedResponse.json();
    console.log(`   ✅ Combined filter jobs: ${combinedData.data?.jobs?.length || 0} jobs found`);
    if (combinedData.data?.jobs?.length > 0) {
      const job = combinedData.data.jobs[0];
      console.log(`   📋 Sample: ${job.title} - ${job.jobDetails?.type} - ${job.location?.type}`);
    }
    console.log('');
    
    // Test 10: Matched jobs with filters
    console.log('🔟 Testing matched jobs with filters...');
    const matchedResponse = await fetch('http://localhost:5000/api/jobs/matched?type=full-time', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const matchedData = await matchedResponse.json();
    console.log(`   ✅ Matched full-time jobs: ${matchedData.data?.jobs?.length || 0} jobs found`);
    if (matchedData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample match score: ${matchedData.data.jobs[0].matchScore}%`);
    }
    console.log('');
    
    // Test 11: Enhanced matched jobs
    console.log('1️⃣1️⃣ Testing enhanced matched jobs...');
    const enhancedResponse = await fetch('http://localhost:5000/api/jobs/enhanced-matched?level=mid', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const enhancedData = await enhancedResponse.json();
    console.log(`   ✅ Enhanced matched mid-level jobs: ${enhancedData.data?.jobs?.length || 0} jobs found`);
    if (enhancedData.data?.jobs?.length > 0) {
      console.log(`   📋 Sample enhanced score: ${enhancedData.data.jobs[0].matchScore}%`);
    }
    console.log('');
    
    // Test 12: Pagination
    console.log('1️⃣2️⃣ Testing pagination...');
    const paginationResponse = await fetch('http://localhost:5000/api/jobs?page=1&limit=3', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const paginationData = await paginationResponse.json();
    console.log(`   ✅ Paginated jobs: ${paginationData.data?.jobs?.length || 0} jobs (limit 3)`);
    console.log(`   📋 Pagination: Page ${paginationData.data?.pagination?.current} of ${paginationData.data?.pagination?.pages}`);
    console.log(`   📋 Total jobs: ${paginationData.data?.pagination?.total}`);
    console.log('');
    
    console.log('🎉 ALL FILTER TESTS COMPLETED!\n');
    console.log('📊 SUMMARY:');
    console.log(`   • Basic jobs: ${basicData.data?.jobs?.length || 0}`);
    console.log(`   • Full-time jobs: ${typeData.data?.jobs?.length || 0}`);
    console.log(`   • Senior level jobs: ${levelData.data?.jobs?.length || 0}`);
    console.log(`   • San Francisco jobs: ${locationData.data?.jobs?.length || 0}`);
    console.log(`   • Remote jobs: ${remoteData.data?.jobs?.length || 0}`);
    console.log(`   • Salary filtered jobs: ${salaryData.data?.jobs?.length || 0}`);
    console.log(`   • JavaScript jobs: ${skillsData.data?.jobs?.length || 0}`);
    console.log(`   • Developer keyword jobs: ${keywordData.data?.jobs?.length || 0}`);
    console.log(`   • Combined filter jobs: ${combinedData.data?.jobs?.length || 0}`);
    console.log(`   • Matched jobs: ${matchedData.data?.jobs?.length || 0}`);
    console.log(`   • Enhanced matched jobs: ${enhancedData.data?.jobs?.length || 0}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

testJobFilters();