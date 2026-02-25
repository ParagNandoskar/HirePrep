/**
 * Seed Leaderboard Script
 * Creates sample leaderboard data for testing the analysis integration
 * 
 * Usage: node backend/src/scripts/seedLeaderboard.js <jobId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Leaderboard = require('../models/Leaderboard');
const Interview = require('../models/Interview');
const Job = require('../models/Job');
const User = require('../models/User');

async function seedLeaderboard(jobId) {
  try {
    console.log('🌱 Seeding leaderboard data...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
    console.log('✅ Connected to MongoDB\n');

    // Get job
    const job = await Job.findById(jobId);
    if (!job) {
      console.error('❌ Job not found with ID:', jobId);
      process.exit(1);
    }
    console.log(`📋 Job: ${job.title}\n`);

    // Find completed interviews for this job
    const interviews = await Interview.find({
      jobId: jobId,
      status: 'completed',
      score: { $exists: true, $ne: null }
    }).populate('studentId');

    console.log(`Found ${interviews.length} completed interviews\n`);

    if (interviews.length === 0) {
      console.log('⚠️  No completed interviews found. Creating sample data...\n');
      
      // Create sample leaderboard with mock scores
      const students = await User.find({ role: 'student' }).limit(5);
      
      if (students.length === 0) {
        console.error('❌ No students found in database');
        process.exit(1);
      }

      const sampleCandidates = students.map((student, index) => ({
        studentId: student._id,
        scores: {
          videoAnalysisScore: Math.floor(Math.random() * 30) + 60, // 60-90
          audioAnalysisScore: Math.floor(Math.random() * 30) + 60, // 60-90
          qaScore: Math.floor(Math.random() * 30) + 60, // 60-90
          overallScore: Math.floor(Math.random() * 30) + 60 // 60-90
        },
        rank: index + 1,
        status: 'reviewed'
      }));

      // Sort by overall score
      sampleCandidates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
      
      // Update ranks
      sampleCandidates.forEach((c, i) => c.rank = i + 1);

      const avgScore = sampleCandidates.reduce((sum, c) => sum + c.scores.overallScore, 0) / sampleCandidates.length;

      // Create or update leaderboard
      const leaderboard = await Leaderboard.findOneAndUpdate(
        { jobId },
        {
          jobId,
          candidates: sampleCandidates,
          totalCandidates: sampleCandidates.length,
          averageScore: Math.round(avgScore),
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('✅ Sample leaderboard created!\n');
      console.log('📊 Leaderboard Summary:');
      console.log(`   Total Candidates: ${leaderboard.totalCandidates}`);
      console.log(`   Average Score: ${leaderboard.averageScore}\n`);

      console.log('🏆 Top 3 Candidates:');
      for (let i = 0; i < Math.min(3, sampleCandidates.length); i++) {
        const candidate = sampleCandidates[i];
        const student = students.find(s => s._id.equals(candidate.studentId));
        console.log(`   ${i + 1}. ${student.name} - ${candidate.scores.overallScore}%`);
      }

    } else {
      // Use actual interview data
      console.log('📊 Creating leaderboard from actual interviews...\n');
      
      const candidates = interviews.map((interview, index) => ({
        studentId: interview.studentId._id,
        interviewId: interview._id,
        scores: {
          videoAnalysisScore: interview.analysis?.videoAnalysis?.overallVideoScore || 0,
          audioAnalysisScore: interview.analysis?.audioAnalysis?.overallAudioScore || 0,
          qaScore: interview.analysis?.qaAnalysis?.overallQAScore || 0,
          overallScore: interview.score || 0
        },
        rank: index + 1,
        status: 'reviewed'
      }));

      // Sort by overall score
      candidates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
      
      // Update ranks
      candidates.forEach((c, i) => c.rank = i + 1);

      const avgScore = candidates.reduce((sum, c) => sum + c.scores.overallScore, 0) / candidates.length;

      // Create or update leaderboard
      const leaderboard = await Leaderboard.findOneAndUpdate(
        { jobId },
        {
          jobId,
          candidates,
          totalCandidates: candidates.length,
          averageScore: Math.round(avgScore),
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );

      console.log('✅ Leaderboard updated from actual interview data!\n');
      console.log('📊 Leaderboard Summary:');
      console.log(`   Total Candidates: ${leaderboard.totalCandidates}`);
      console.log(`   Average Score: ${leaderboard.averageScore}\n`);

      console.log('🏆 Top 3 Candidates:');
      for (let i = 0; i < Math.min(3, candidates.length); i++) {
        const candidate = candidates[i];
        const student = interviews.find(int => int.studentId._id.equals(candidate.studentId)).studentId;
        console.log(`   ${i + 1}. ${student.name} - ${candidate.scores.overallScore}%`);
      }
    }

    console.log('\n✅ Leaderboard seeding complete!');
    console.log(`\n🌐 View at: http://localhost:5173/leaderboard`);
    console.log(`📡 API: GET /api/analysis/leaderboard/${jobId}\n`);

  } catch (error) {
    console.error('❌ Error seeding leaderboard:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get jobId from command line
const jobId = process.argv[2];

if (!jobId) {
  console.error('\n❌ Usage: node seedLeaderboard.js <jobId>');
  console.error('\nExample: node seedLeaderboard.js 507f1f77bcf86cd799439011\n');
  process.exit(1);
}

// Validate MongoDB ObjectId format
if (!mongoose.Types.ObjectId.isValid(jobId)) {
  console.error('\n❌ Invalid MongoDB ObjectId format\n');
  process.exit(1);
}

seedLeaderboard(jobId);
