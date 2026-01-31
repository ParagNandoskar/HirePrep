// Test S3 connection and signed URL generation
require('dotenv').config();
const { s3Client, getSignedFileUrl, checkS3Connection } = require('./src/config/aws');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

async function testS3() {
  console.log('🧪 Testing S3 Configuration...\n');
  
  console.log('📋 Environment Variables:');
  console.log('AWS_REGION:', process.env.AWS_REGION);
  console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not Set');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not Set');
  console.log('\n');

  // Test bucket connection
  console.log('🔍 Testing S3 Bucket Connection...');
  const connectionTest = await checkS3Connection();
  console.log(connectionTest.success ? '✅' : '❌', connectionTest.message);
  console.log('\n');

  // Test signed URL generation
  console.log('🔐 Testing Signed URL Generation...');
  const testKey = 'profile-images/1761878368238-dptgj8yre4u.png';
  
  try {
    const signedUrl = await getSignedFileUrl(testKey, 3600);
    console.log('✅ Signed URL generated successfully!');
    console.log('🔗 URL:', signedUrl);
    console.log('\n');
    
    // Test if the file exists
    console.log('📥 Testing file access...');
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: testKey
    });
    
    try {
      await s3Client.send(command);
      console.log('✅ File exists and is accessible!');
    } catch (fileError) {
      console.error('❌ File access error:', {
        code: fileError.Code || fileError.name,
        message: fileError.message,
        statusCode: fileError.$metadata?.httpStatusCode
      });
    }
  } catch (error) {
    console.error('❌ Signed URL generation failed:', {
      code: error.Code || error.name,
      message: error.message,
      statusCode: error.$metadata?.httpStatusCode
    });
  }
}

testS3().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
