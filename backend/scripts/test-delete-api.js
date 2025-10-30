const mongoose = require('mongoose');
const User = require('../src/models/User');
const Resume = require('../src/models/Resume');
const { generateToken } = require('../src/utils/jwt');
require('dotenv').config();

async function testDeleteAPI() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const user = await User.findOne({ email: 'test2@gmail.com' });
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    const fetch = (await import('node-fetch')).default;
    
    console.log('\n🗑️ TESTING DELETE API\n');
    
    // First, get all resumes
    console.log('📋 Getting all resumes...');
    const getResponse = await fetch('http://localhost:5000/api/resumes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const resumesData = await getResponse.json();
    console.log('📋 Get resumes response:', resumesData);
    
    if (resumesData.success && resumesData.data.resumes.length > 0) {
      const resumeToDelete = resumesData.data.resumes[0];
      console.log(`\n🎯 Testing delete for resume: ${resumeToDelete.filename}`);
      console.log(`🆔 Resume ID: ${resumeToDelete._id}`);
      
      // Test delete API
      const deleteResponse = await fetch(`http://localhost:5000/api/resumes/${resumeToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const deleteData = await deleteResponse.json();
      console.log('\n🗑️ Delete response:', deleteData);
      console.log(`🔧 Status: ${deleteResponse.status}`);
      
      if (deleteResponse.ok) {
        console.log('✅ Delete API working correctly');
        
        // Verify deletion
        const verifyResponse = await fetch('http://localhost:5000/api/resumes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const verifyData = await verifyResponse.json();
        console.log(`\n✔️ Verification: ${verifyData.data.resumes.length} resumes remaining`);
      } else {
        console.log('❌ Delete API failed');
        console.log('Error details:', deleteData);
      }
    } else {
      console.log('📭 No resumes found to test deletion');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Test Error:', err);
    process.exit(1);
  }
}

testDeleteAPI();