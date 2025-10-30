const mongoose = require('mongoose');
const User = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function uploadTestResume() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');
    
    const user = await User.findOne({ email: 'test@gmail.com' });
    const token = generateToken({ id: user._id, email: user.email, role: user.role });
    const fetch = (await import('node-fetch')).default;
    const FormData = (await import('form-data')).default;
    
    console.log('\n📤 UPLOADING TEST RESUME\n');
    
    // Create a simple test PDF content
    const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R 
>>
>>
/MediaBox [0 0 612 792]
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Resume) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000361 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
456
%%EOF`;

    // Write test PDF to temp file
    const tempPath = path.join(__dirname, '../temp/test-resume.pdf');
    fs.writeFileSync(tempPath, testPdfContent);
    
    // Upload the test resume
    const formData = new FormData();
    formData.append('resume', fs.createReadStream(tempPath), {
      filename: 'test-resume.pdf',
      contentType: 'application/pdf'
    });
    
    const uploadResponse = await fetch('http://localhost:5000/api/resumes/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const uploadResult = await uploadResponse.json();
    console.log('📤 Upload response:', uploadResult);
    
    if (uploadResponse.ok) {
      console.log('✅ Resume uploaded successfully');
      
      // Clean up temp file
      fs.unlinkSync(tempPath);
      
      // Get all resumes to verify
      const getResponse = await fetch('http://localhost:5000/api/resumes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const getResult = await getResponse.json();
      console.log('📋 Current resumes:', getResult.data?.resumes?.length || 0);
      
    } else {
      console.log('❌ Upload failed:', uploadResult);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

uploadTestResume();