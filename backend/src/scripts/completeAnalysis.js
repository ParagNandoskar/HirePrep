/**
 * Force Complete Pending Interviews Script
 * 
 * This script finds interviews stuck in "pending analysis" state and completes them.
 * Use this if interviews are stuck with analysisComplete: false
 * 
 * Usage: node backend/src/scripts/completeAnalysis.js [interviewId]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Interview = require('../models/Interview');
const Application = require('../models/Application');
const interviewAnalysisService = require('../services/interviewAnalysisService');

async function completeAnalysisForInterview(interviewId) {
  try {
    console.log(`\n🔍 Checking interview ${interviewId}...`);
    
    const interview = await Interview.findById(interviewId).populate('jobId');
    if (!interview) {
      console.error(`❌ Interview not found`);
      return false;
    }

    console.log(`   Job: ${interview.jobId?.title || 'Unknown'}`);
    console.log(`   Status: ${interview.status}`);
    console.log(`   Analysis Complete: ${interview.analysisComplete}`);
    console.log(`   Preliminary Score: ${interview.preliminaryScore || 'N/A'}`);
    console.log(`   Final Score: ${interview.finalScore || 'N/A'}`);

    if (interview.analysisComplete) {
      console.log(`✅ Interview analysis already complete`);
      return true;
    }

    console.log(`\n🎬 Running video/audio analysis...`);
    
    try {
      await interviewAnalysisService.analyzeCompletedInterview(interviewId);
      console.log(`✅ Analysis completed successfully!`);
      
      // Reload to get updated data
      const updatedInterview = await Interview.findById(interviewId);
      console.log(`\n📊 Results:`);
      console.log(`   Final Score: ${updatedInterview.finalScore || updatedInterview.score}/100`);
      console.log(`   Video Score: ${updatedInterview.analysis?.videoAnalysis?.overallVideoScore || 'N/A'}`);
      console.log(`   Audio Score: ${updatedInterview.analysis?.audioAnalysis?.overallAudioScore || 'N/A'}`);
      console.log(`   Analysis Complete: ${updatedInterview.analysisComplete}`);
      
      // Update application screeningScore
      if (updatedInterview.applicationId) {
        await Application.findByIdAndUpdate(updatedInterview.applicationId, {
          screeningScore: updatedInterview.finalScore || updatedInterview.score
        });
        console.log(`✅ Updated application screeningScore`);
      }
      
      return true;
    } catch (analysisError) {
      console.error(`❌ Analysis failed:`, analysisError.message);
      
      // Mark as complete with preliminary score
      interview.analysisComplete = true;
      interview.finalScore = interview.preliminaryScore;
      interview.score = interview.preliminaryScore;
      if (!interview.analysis) interview.analysis = {};
      interview.analysis.error = analysisError.message;
      await interview.save();
      
      console.log(`⚠️ Marked as complete with preliminary score: ${interview.preliminaryScore}/100`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error:`, error);
    return false;
  }
}

async function completeAllPendingAnalyses() {
  try {
    console.log('🔄 Finding all interviews with pending analysis...\n');
    console.log('='.repeat(60));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
    console.log('✅ Connected to MongoDB\n');

    // Find interviews with pending analysis
    const pendingInterviews = await Interview.find({
      analysisComplete: false,
      status: 'completed',
      preliminaryScore: { $exists: true }
    }).populate('jobId');

    console.log(`Found ${pendingInterviews.length} interviews with pending analysis\n`);
    console.log('='.repeat(60) + '\n');

    if (pendingInterviews.length === 0) {
      console.log('✅ No pending analyses found!\n');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const interview of pendingInterviews) {
      const success = await completeAnalysisForInterview(interview._id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Total: ${pendingInterviews.length}`);
    console.log(`   Completed: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Main execution
const specificInterviewId = process.argv[2];

if (specificInterviewId) {
  // Complete specific interview
  if (!mongoose.Types.ObjectId.isValid(specificInterviewId)) {
    console.error('\n❌ Invalid MongoDB ObjectId format\n');
    process.exit(1);
  }
  
  (async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hireprep');
      console.log('✅ Connected to MongoDB');
      await completeAnalysisForInterview(specificInterviewId);
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      await mongoose.disconnect();
      console.log('\nDisconnected from MongoDB');
    }
  })();
} else {
  // Complete all pending
  completeAllPendingAnalyses();
}