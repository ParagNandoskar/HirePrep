/**
 * Sync Leaderboards Script
 * Populates leaderboards from existing interview and application data
 * Handles both old screening interviews and new analysis-based interviews
 * 
 * Usage: node backend/src/scripts/syncLeaderboards.js [jobId]
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Leaderboard = require('../models/Leaderboard');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

async function syncLeaderboardForJob(jobId) {
  try {
    console.log(`\n📊 Syncing leaderboard for job ${jobId}...`);
    
    const job = await Job.findById(jobId);
    if (!job) {
      console.error(`❌ Job not found: ${jobId}`);
      return;
    }
    
    console.log(`   Job: ${job.title}\n`);

    // Strategy 1: Find interviews with scores
    const interviews = await Interview.find({
      jobId: jobId,
      status: 'completed',
      $or: [
        { score: { $exists: true, $ne: null } },
        { 'analysis.overallScore': { $exists: true, $ne: null } }
      ]
    }).populate('studentId', 'name email profile');

    // Strategy 2: Find applications with screening scores
    const applications = await Application.find({
      jobId: jobId,
      interviewCompleted: true,
      screeningScore: { $exists: true, $ne: null }
    }).populate('candidateId', 'name email profile');

    console.log(`   Found ${interviews.length} completed interviews`);
    console.log(`   Found ${applications.length} applications with scores\n`);

    // Combine data sources
    const candidateMap = new Map();

    // Add interviews
    for (const interview of interviews) {
      const studentId = interview.studentId._id.toString();
      const overallScore = interview.score || interview.analysis?.overallScore || 0;
      
      candidateMap.set(studentId, {
        studentId: interview.studentId._id,
        studentName: interview.studentId.name,
        interviewId: interview._id,
        scores: {
          videoAnalysisScore: interview.analysis?.videoAnalysis?.overallVideoScore || 0,
          audioAnalysisScore: interview.analysis?.audioAnalysis?.overallAudioScore || 0,
          qaScore: interview.analysis?.qaAnalysis?.overallQAScore || 0,
          overallScore: overallScore
        },
        status: 'reviewed',
        source: 'interview'
      });
    }

    // Add applications (if not already in map from interviews)
    for (const app of applications) {
      const candidateId = app.candidateId._id.toString();
      if (!candidateMap.has(candidateId)) {
        candidateMap.set(candidateId, {
          studentId: app.candidateId._id,
          studentName: app.candidateId.name,
          applicationId: app._id,
          scores: {
            videoAnalysisScore: 0,
            audioAnalysisScore: 0,
            qaScore: 0,
            overallScore: app.screeningScore || 0
          },
          status: 'reviewed',
          source: 'application'
        });
      }
    }

    const candidates = Array.from(candidateMap.values());

    if (candidates.length === 0) {
      console.log('   ⚠️  No candidates found for this job\n');
      return;
    }

    // Sort by overall score (descending)
    candidates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

    // Assign ranks
    candidates.forEach((candidate, index) => {
      candidate.rank = index + 1;
      delete candidate.studentName; // Remove temp field
      delete candidate.source; // Remove temp field
    });

    // Calculate average score
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

    console.log(`   ✅ Leaderboard updated!`);
    console.log(`   📊 Total Candidates: ${leaderboard.totalCandidates}`);
    console.log(`   📈 Average Score: ${Math.round(leaderboard.averageScore)}%\n`);

    // Show top candidates
    const topCount = Math.min(5, candidates.length);
    console.log(`   🏆 Top ${topCount} Candidates:`);
    for (let i = 0; i < topCount; i++) {
      const candidate = candidates[i];
      const student = interviews.find(int => int.studentId._id.equals(candidate.studentId))?.studentId ||
                     applications.find(app => app.candidateId._id.equals(candidate.studentId))?.candidateId;
      console.log(`      ${i + 1}. ${student?.name || 'Unknown'} - ${candidate.scores.overallScore}%`);
    }
    console.log('');

  } catch (error) {
    console.error(`   ❌ Error syncing job ${jobId}:`, error.message);
  }
}

async function syncAllLeaderboards() {
  try {
    console.log('🔄 Syncing all leaderboards...\n');
    console.log('============================================================');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
    console.log('✅ Connected to MongoDB\n');

    // Find all jobs that have interviews or applications
    const jobsWithInterviews = await Interview.distinct('jobId', {
      status: 'completed',
      $or: [
        { score: { $exists: true, $ne: null } },
        { 'analysis.overallScore': { $exists: true, $ne: null } }
      ]
    });

    const jobsWithApplications = await Application.distinct('jobId', {
      interviewCompleted: true,
      screeningScore: { $exists: true, $ne: null }
    });

    // Combine and deduplicate
    const allJobIds = [...new Set([...jobsWithInterviews, ...jobsWithApplications])];

    console.log(`Found ${allJobIds.length} jobs with interview data\n`);
    console.log('============================================================\n');

    if (allJobIds.length === 0) {
      console.log('⚠️  No jobs found with interview data');
      console.log('\nTo test the leaderboard:');
      console.log('1. Complete an interview through the frontend');
      console.log('2. Or use: node src/scripts/seedLeaderboard.js <jobId>\n');
      return;
    }

    // Sync each job
    for (const jobId of allJobIds) {
      await syncLeaderboardForJob(jobId);
    }

    console.log('============================================================');
    console.log(`✅ Successfully synced ${allJobIds.length} leaderboards!\n`);
    console.log(`🌐 View leaderboards at: http://localhost:5173/leaderboard\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Main execution
const specificJobId = process.argv[2];

if (specificJobId) {
  // Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(specificJobId)) {
    console.error('\n❌ Invalid MongoDB ObjectId format\n');
    process.exit(1);
  }
  
  // Sync specific job
  (async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
      console.log('✅ Connected to MongoDB');
      await syncLeaderboardForJob(specificJobId);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await mongoose.disconnect();
      console.log('\nDisconnected from MongoDB');
    }
  })();
} else {
  // Sync all jobs
  syncAllLeaderboards();
}
