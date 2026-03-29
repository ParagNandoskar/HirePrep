/**
 * End-to-End Parallel Analysis Test Script
 * 
 * This script tests the complete flow of the parallel analysis system:
 * 1. Frontend captures video frames and audio chunks
 * 2. Sends to all three services simultaneously (Video, Audio, Content)
 * 3. Backend aggregates results
 * 4. Final score calculated with proper weighting
 * 
 * Usage: node backend/src/scripts/testParallelAnalysis.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Interview = require('../models/Interview');
const analysisService = require('../services/analysisService');
const { SERVICES } = require('../config/services');

// Service URLs
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const VIDEO_SERVICE_URL = SERVICES.VIDEO;
const AUDIO_SERVICE_URL = SERVICES.AUDIO;

console.log('\n' + '='.repeat(80));
console.log('🧪 END-TO-END PARALLEL ANALYSIS TEST');
console.log('='.repeat(80));
console.log(`   Backend: ${BACKEND_URL}`);
console.log(`   Video Service: ${VIDEO_SERVICE_URL}`);
console.log(`   Audio Service: ${AUDIO_SERVICE_URL}`);
console.log('='.repeat(80) + '\n');

/**
 * Test 1: Check Service Health
 */
async function testServiceHealth() {
  console.log('\n📡 TEST 1: Checking Service Health...\n');
  
  const services = [
    { name: 'Backend', url: `${BACKEND_URL}/api/health` },
    { name: 'Video Service', url: `${VIDEO_SERVICE_URL}/health` },
    { name: 'Audio Service', url: `${AUDIO_SERVICE_URL}/health` }
  ];
  
  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 5000 });
      console.log(`✅ ${service.name}: ${response.data.status || 'healthy'}`);
    } catch (error) {
      console.error(`❌ ${service.name}: ${error.message}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Test 2: Test Video Analysis (with mock frame data)
 */
async function testVideoAnalysis() {
  console.log('\n🎥 TEST 2: Testing Video Analysis...\n');
  
  try {
    // Create mock base64 video frames (simple colored squares)
    const mockFrames = [];
    for (let i = 0; i < 5; i++) {
      // Create a simple 100x100 pixel image in base64
      const canvas = createMockCanvas(100, 100, `rgb(${i * 50}, ${i * 30}, 255)`);
      mockFrames.push(canvas);
    }
    
    console.log(`   Created ${mockFrames.length} mock video frames`);
    console.log(`   Sending to: ${VIDEO_SERVICE_URL}/analyze-video`);
    
    const response = await axios.post(`${VIDEO_SERVICE_URL}/analyze-video`, {
      videoData: mockFrames,
      interviewId: 'test_interview_' + Date.now(),
      candidateId: 'test_candidate',
      questionId: 1
    }, {
      timeout: 30000
    });
    
    console.log('\n✅ Video Analysis Response:');
    console.log(`   Overall Score: ${response.data.overallVideoScore}/100`);
    console.log(`   Eye Contact: ${response.data.eyeContactScore}/100`);
    console.log(`   Engagement: ${response.data.engagementScore}/100`);
    console.log(`   Frames Analyzed: ${response.data.analysisMetadata?.framesAnalyzed || 0}`);
    
    return response.data;
  } catch (error) {
    console.error(`\n❌ Video Analysis Failed:`);
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return null;
  }
}

/**
 * Test 3: Test Audio Analysis (with mock audio data)
 */
async function testAudioAnalysis() {
  console.log('\n🎤 TEST 3: Testing Audio Analysis...\n');
  
  try {
    // Create mock audio data (silent WAV file in base64)
    const mockAudioBase64 = createMockWAVBase64();
    const mockTranscript = "Hello, I am testing the audio analysis system. This is a sample transcript with good clarity and confidence in my voice.";
    
    console.log(`   Created mock audio data (${mockAudioBase64.length} chars)`);
    console.log(`   Transcript: "${mockTranscript.substring(0, 50)}..."`);
    console.log(`   Sending to: ${AUDIO_SERVICE_URL}/analyze-audio`);
    
    const response = await axios.post(`${AUDIO_SERVICE_URL}/analyze-audio`, {
      audio_base64: mockAudioBase64,
      transcript: mockTranscript
    }, {
      timeout: 30000
    });
    
    console.log('\n✅ Audio Analysis Response:');
    console.log(`   Voice Confidence: ${response.data.voice_confidence}/100`);
    console.log(`   Speaking Rate: ${response.data.speaking_rate} WPM`);
    console.log(`   Volume Consistency: ${response.data.volume_consistency}/100`);
    console.log(`   Nervousness Score: ${response.data.nervousness_score}/100`);
    console.log(`   Filler Words: ${response.data.filler_words?.count || 0}`);
    console.log(`   Overall Score: ${response.data.overall_score}/100`);
    
    return response.data;
  } catch (error) {
    console.error(`\n❌ Audio Analysis Failed:`);
    console.error(`   ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return null;
  }
}

/**Test 4: Test Parallel Analysis (Video + Audio + Content)
 */
async function testParallelAnalysis() {
  console.log('\n📊 TEST 4: Testing Parallel Analysis Flow...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
    console.log('✅ Connected to MongoDB\n');
    
    // Create a test interview
    const testInterview = await Interview.create({
      jobId: new mongoose.Types.ObjectId(),
      applicationId: new mongoose.Types.ObjectId(),
      candidateId: new mongoose.Types.ObjectId(),
      status: 'in-progress',
      conversation: [
        {
          questionId: 1,
          question: 'Tell me about yourself',
          answer: 'I am a software engineer with 5 years of experience...'
        }
      ],
      preliminaryScore: 75,
      analysisComplete: false
    });
    
    console.log(`✅ Created test interview: ${testInterview._id}\n`);
    
    // Test parallel analysis with backend service
    console.log('🚀 Running parallel video + audio analysis...\n');
    
    const mockFrames = Array(5).fill(createMockCanvas(100, 100, 'rgb(100, 150, 255)'));
    const mockAudio = createMockWAVBase64();
    const mockTranscript = "I have strong experience in full-stack development with React and Node.js.";
    
    const result = await analysisService.processInterviewAnswer(
      testInterview._id,
      testInterview.candidateId,
      1,
      mockFrames,
      mockAudio,
      mockTranscript
    );
    
    if (result.success) {
      console.log('\n✅ Parallel Analysis Complete:');
      console.log(`   Video Score: ${result.data.videoAnalysis?.overallScore || 0}/100`);
      console.log(`   Audio Score: ${result.data.audioAnalysis?.overallScore || 0}/100`);
      console.log(`   Combined Score: ${result.data.combinedScore || 0}/100`);
      
      // Test finalization
      console.log('\n📊 Testing interview finalization...\n');
      
      const finalResult = await analysisService.finalizeInterview(testInterview._id);
      
      if (finalResult.success) {
        console.log('\n✅ Finalization Complete:');
        console.log(`   Video Score: ${finalResult.data.videoScore}/100 (30% weight)`);
        console.log(`   Audio Score: ${finalResult.data.audioScore}/100 (30% weight)`);
        console.log(`   Content Score: ${finalResult.data.contentScore}/100 (40% weight)`);
        console.log('   ─'.repeat(40));
        console.log(`   FINAL SCORE: ${finalResult.data.finalScore}/100`);
      }
    }
    
    // Cleanup
    await Interview.deleteOne({ _id: testInterview._id });
    console.log(`\n🗑️  Cleaned up test interview\n`);
    
    return result;
  } catch (error) {
    console.error(`\n❌ Parallel Analysis Failed:`);
    console.error(`   ${error.message}`);
    return null;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB\n');
  }
}

/**
 * Test 5: Test Leaderboard Update
 */
async function testLeaderboardUpdate() {
  console.log('\n🏆 TEST 5: Testing Leaderboard Update...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
    
    // Create test job and interview
    const jobId = new mongoose.Types.ObjectId();
    const candidateId = new mongoose.Types.ObjectId();
    
    const testInterview = await Interview.create({
      jobId,
      applicationId: new mongoose.Types.ObjectId(),
      candidateId,
      status: 'completed',
      finalScore: 85,
      analysis: {
        videoAnalysis: { overallVideoScore: 80 },
        audioAnalysis: { overallAudioScore: 90 }
      },
      analysisComplete: true
    });
    
    console.log (`✅ Created test interview with score: 85/100\n`);
    
    // Update leaderboard
    await analysisService.updateLeaderboard(testInterview);
    
    console.log('✅ Leaderboard updated successfully\n');
    
    // Verify leaderboard
    const leaderboard = await analysisService.getJobLeaderboard(jobId);
    
    if (leaderboard.success && leaderboard.data.leaderboard.length > 0) {
      console.log('📊 Leaderboard Entries:');
      leaderboard.data.leaderboard.forEach((entry, index) => {
        console.log(`   ${index + 1}. Score: ${entry.score}/100`);
      });
    }
    
    // Cleanup
    await Interview.deleteOne({ _id: testInterview._id });
    await mongoose.connection.collection('leaderboards').deleteMany({ jobId });
    
    console.log(`\n🗑️  Cleaned up test data\n`);
    
    return true;
  } catch (error) {
    console.error(`\n❌ Leaderboard Test Failed:`);
    console.error(`   ${error.message}`);
    return false;
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Helper: Create mock canvas/image base64
 */
function createMockCanvas(width, height, color) {
  // Create a simple PNG header + data (1x1 pixel transparent PNG)
  const base64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';
  return base64;
}

/**
 * Helper: Create mock WAV file base64 (silent 1 second audio)
 */
function createMockWAVBase64() {
  // Minimal WAV header + silent audio data
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const duration = 1; // 1 second
  const numSamples = sampleRate * duration;
  
  // Create WAV header (44 bytes)
  const buffer = Buffer.alloc(44 + numSamples * 2);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
  buffer.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  
  // Silent audio data (all zeros)
  for (let i = 0; i < numSamples; i++) {
    buffer.writeInt16LE(0, 44 + i * 2);
  }
  
  return buffer.toString('base64');
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n🚀 Starting comprehensive parallel analysis tests...\n');
  
  const results = {
    serviceHealth: false,
    videoAnalysis: false,
    audioAnalysis: false,
    parallelAnalysis: false,
    leaderboard: false
  };
  
  try {
    // Test 1: Service Health
    results.serviceHealth = await testServiceHealth();
    
    if (!results.serviceHealth) {
      console.error('\n❌ Service health check failed. Please ensure all services are running:');
      console.error('   - Backend: npm run dev (port 3000)');
      console.error('   - NLP Service: cd backend/nlp-service && python app.py');
      console.error('   - Audio Service: cd backend/audio-service && python app.py');
      console.error('   - Video Service: cd backend/video-service && python app.py');
      process.exit(1);
    }
    
    // Test 2: Video Analysis
    const videoResult = await testVideoAnalysis();
    results.videoAnalysis = !!videoResult;
    
    // Test 3: Audio Analysis
    const audioResult = await testAudioAnalysis();
    results.audioAnalysis = !!audioResult;
    
    // Test 4: Parallel Analysis
    const parallelResult = await testParallelAnalysis();
    results.parallelAnalysis = !!parallelResult;
    
    // Test 5: Leaderboard
    results.leaderboard = await testLeaderboardUpdate();
    
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
  }
  
  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`   ✅ Service Health: ${results.serviceHealth ? 'PASS' : 'FAIL'}`);
  console.log(`   ${results.videoAnalysis ? '✅' : '❌'} Video Analysis: ${results.videoAnalysis ? 'PASS' : 'FAIL'}`);
  console.log(`   ${results.audioAnalysis ? '✅' : '❌'} Audio Analysis: ${results.audioAnalysis ? 'PASS' : 'FAIL'}`);
  console.log(`   ${results.parallelAnalysis ? '✅' : '❌'} Parallel Analysis: ${results.parallelAnalysis ? 'PASS' : 'FAIL'}`);
  console.log(`   ${results.leaderboard ? '✅' : '❌'} Leaderboard Update: ${results.leaderboard ? 'PASS' : 'FAIL'}`);
  console.log('='.repeat(80));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! Parallel analysis system is working correctly.\n');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please check the logs above for details.\n');
  }
}

// Run tests
runAllTests().then(() => {
  console.log('Test suite complete.');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
