/**
 * Interview Analysis Service
 * Handles async video and audio analysis after interview submission
 * 
 * Processing Time: 5-10 minutes for complete analysis
 * Cost: ~$0.05-0.10 per interview
 * 
 * Score Weights:
 * - 80%: AI text evaluation (transcript content)
 * - 10%: Video analysis (body language, emotions)
 * - 10%: Audio analysis (tone, clarity, confidence)
 */

const axios = require('axios');
const Interview = require('../models/Interview');
const videoDeletionService = require('./videoDeletionService');

// Python microservices URLs
const VIDEO_ANALYSIS_SERVICE = process.env.VIDEO_ANALYSIS_URL || 'http://localhost:8001';
const AUDIO_ANALYSIS_SERVICE = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8002';

/**
 * Analyze completed interview with video/audio analysis
 * This runs asynchronously after interview submission
 */
const analyzeCompletedInterview = async (interviewId) => {
  try {
    console.log(`🎬 Starting analysis for interview: ${interviewId}`);
    const startTime = Date.now();

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      throw new Error('Interview not found');
    }

    console.log(`📊 Analysis Configuration:`);
    console.log(`   Video Service: ${VIDEO_ANALYSIS_SERVICE || 'NOT CONFIGURED'}`);
    console.log(`   Audio Service: ${AUDIO_ANALYSIS_SERVICE || 'NOT CONFIGURED'}`);
    console.log(`   Questions to analyze: ${interview.conversation.length}`);

    const videoAnalysisResults = [];
    const audioAnalysisResults = [];

    // Analyze each question-answer pair
    for (const qa of interview.conversation) {
      if (qa.videoUrl && !qa.analysisStatus.videoAnalyzed) {
        try {
          console.log(`📹 Analyzing video for question ${qa.questionId}...`);

          // Analyze video and audio in parallel
          const [videoAnalysis, audioAnalysis] = await Promise.all([
            analyzeVideo(qa.videoUrl),
            analyzeAudio(qa.videoUrl)
          ]);

          videoAnalysisResults.push(videoAnalysis);
          audioAnalysisResults.push(audioAnalysis);

          // Update QA analysis status
          qa.analysisStatus.videoAnalyzed = true;
          qa.analysisStatus.audioAnalyzed = true;

          console.log(`✅ Analysis complete for question ${qa.questionId}`);

        } catch (error) {
          console.error(`❌ Analysis failed for question ${qa.questionId}:`, error);
          
          // Continue with other questions even if one fails
          videoAnalysisResults.push(null);
          audioAnalysisResults.push(null);
        }
      }
    }

    // Calculate aggregate analysis scores
    const aggregateVideoAnalysis = calculateAggregateVideoAnalysis(videoAnalysisResults);
    const aggregateAudioAnalysis = calculateAggregateAudioAnalysis(audioAnalysisResults);

    // Save analysis results
    interview.analysis = {
      videoAnalysis: {
        ...aggregateVideoAnalysis,
        analyzedAt: new Date(),
        processingTime: (Date.now() - startTime) / 1000,
        isMock: aggregateVideoAnalysis.isMock || false,
        analysisMethod: aggregateVideoAnalysis.isMock ? 'MOCK DATA' : 'REAL ANALYSIS'
      },
      audioAnalysis: {
        ...aggregateAudioAnalysis,
        analyzedAt: new Date(),
        processingTime: (Date.now() - startTime) / 1000,
        isMock: aggregateAudioAnalysis.isMock || false,
        analysisMethod: aggregateAudioAnalysis.isMock ? 'MOCK DATA' : 'REAL ANALYSIS'
      }
    };

    // Calculate final score (weighted combination)
    const finalScore = calculateFinalScore(
      interview.preliminaryScore, // AI text evaluation (80%)
      aggregateVideoAnalysis.overallVideoScore, // Video (10%)
      aggregateAudioAnalysis.overallAudioScore // Audio (10%)
    );

    interview.finalScore = finalScore;
    interview.score = finalScore; // Update main score field
    interview.analysisComplete = true;

    await interview.save();

    const analysisType = (interview.analysis.videoAnalysis.isMock || interview.analysis.audioAnalysis.isMock) 
      ? '⚠️ MOCK ANALYSIS' 
      : '✅ REAL ANALYSIS';
    
    console.log(`✅ Analysis complete. Final score: ${finalScore} (preliminary: ${interview.preliminaryScore})`);
    console.log(`   Analysis Type: ${analysisType}`);
    
    if (interview.analysis.videoAnalysis.isMock || interview.analysis.audioAnalysis.isMock) {
      console.warn(`🚨 WARNING: This interview used MOCK analysis data.`);
      console.warn(`   To enable real analysis, please start the Python services:`);
      console.warn(`   - Video Analysis: ${VIDEO_ANALYSIS_SERVICE}`);
      console.warn(`   - Audio Analysis: ${AUDIO_ANALYSIS_SERVICE}`);
    }

    // Delete videos from S3 now that analysis is complete
    console.log('🗑️ Deleting videos from S3...');
    await videoDeletionService.cleanupInterviewVideos(interviewId);

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log(`✅ Complete analysis finished in ${totalTime} minutes`);

    return interview;

  } catch (error) {
    console.error('❌ Interview analysis failed:', error);
    throw error;
  }
};

/**
 * Analyze video using Python microservice
 */
const analyzeVideo = async (videoUrl) => {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎬 VIDEO ANALYSIS - Legacy Method`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Service URL: ${VIDEO_ANALYSIS_SERVICE}`);
    console.log(`   Video URL: ${videoUrl}`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Check if video analysis service is configured
    if (!VIDEO_ANALYSIS_SERVICE) {
      console.error('❌ VIDEO_ANALYSIS_URL not configured in environment');
      console.warn('🚨 USING MOCK DATA');
      return getMockVideoAnalysis();
    }

    console.log('🚀 Sending video URL to analysis service...');
    const response = await axios.post(
      `${VIDEO_ANALYSIS_SERVICE}/analyze-video`,
      { videoUrl },
      { timeout: 300000 } // 5 minute timeout
    );

    console.log(`\n✅ VIDEO ANALYSIS SUCCESS`);
    console.log(`   Score: ${response.data.overallVideoScore || 0}/100`);
    console.log(`${'='.repeat(70)}\n`);
    
    return response.data;

  } catch (error) {
    console.error(`\n❌ VIDEO ANALYSIS FAILED`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    console.error(`${'='.repeat(70)}\n`);
    console.warn('🚨 FALLING BACK TO MOCK DATA');
    return getMockVideoAnalysis();
  }
};

/**
 * Analyze audio using Python microservice
 */
const analyzeAudio = async (videoUrl) => {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎤 AUDIO ANALYSIS - Legacy Method`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Service URL: ${AUDIO_ANALYSIS_SERVICE}`);
    console.log(`   Video URL: ${videoUrl}`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Check if audio analysis service is configured
    if (!AUDIO_ANALYSIS_SERVICE) {
      console.error('❌ AUDIO_ANALYSIS_URL not configured in environment');
      console.warn('🚨 USING MOCK DATA');
      return getMockAudioAnalysis();
    }

    console.log('🚀 Sending video URL for audio extraction and analysis...');
    const response = await axios.post(
      `${AUDIO_ANALYSIS_SERVICE}/analyze-audio`,
      { videoUrl },
      { timeout: 300000 } // 5 minute timeout
    );

    console.log(`\n✅ AUDIO ANALYSIS SUCCESS`);
    console.log(`   Voice Confidence: ${response.data.voice_confidence || 0}/100`);
    console.log(`   Overall Score: ${response.data.overall_score || 0}/100`);
    console.log(`${'='.repeat(70)}\n`);
    
    return response.data;

  } catch (error) {
    console.error(`\n❌ AUDIO ANALYSIS FAILED`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data)}`);
    }
    console.error(`${'='.repeat(70)}\n`);
    console.warn('🚨 FALLING BACK TO MOCK DATA');
    return getMockAudioAnalysis();
  }
};

/**
 * Calculate aggregate video analysis from all responses
 */
const calculateAggregateVideoAnalysis = (videoResults) => {
  const validResults = videoResults.filter(r => r !== null);
  
  if (validResults.length === 0) {
    return {
      emotionScores: [],
      eyeContactScore: 0,
      engagementScore: 0,
      confidenceScore: 0,
      overallVideoScore: 0
    };
  }

  // Average all video scores
  const avgEyeContact = average(validResults.map(r => r.eyeContactScore || 0));
  const avgEngagement = average(validResults.map(r => r.engagementScore || 0));
  const avgConfidence = average(validResults.map(r => r.confidenceScore || 0));

  // Combine emotion scores
  const allEmotions = validResults.flatMap(r => r.emotionScores || []);

  return {
    emotionScores: allEmotions,
    eyeContactScore: Math.round(avgEyeContact),
    engagementScore: Math.round(avgEngagement),
    confidenceScore: Math.round(avgConfidence),
    overallVideoScore: Math.round((avgEyeContact + avgEngagement + avgConfidence) / 3)
  };
};

/**
 * Calculate aggregate audio analysis from all responses
 */
const calculateAggregateAudioAnalysis = (audioResults) => {
  const validResults = audioResults.filter(r => r !== null);
  
  if (validResults.length === 0) {
    return {
      toneAnalysis: {
        confidence: 0,
        enthusiasm: 0,
        clarity: 0,
        pace: 'moderate',
        wordsPerMinute: 0
      },
      stressLevel: 0,
      overallAudioScore: 0
    };
  }

  // Average all audio scores
  const avgConfidence = average(validResults.map(r => r.toneAnalysis?.confidence || 0));
  const avgEnthusiasm = average(validResults.map(r => r.toneAnalysis?.enthusiasm || 0));
  const avgClarity = average(validResults.map(r => r.toneAnalysis?.clarity || 0));
  const avgWPM = average(validResults.map(r => r.toneAnalysis?.wordsPerMinute || 0));
  const avgStress = average(validResults.map(r => r.stressLevel || 0));

  // Determine overall pace
  let pace = 'moderate';
  if (avgWPM < 120) pace = 'slow';
  if (avgWPM > 160) pace = 'fast';

  return {
    toneAnalysis: {
      confidence: Math.round(avgConfidence),
      enthusiasm: Math.round(avgEnthusiasm),
      clarity: Math.round(avgClarity),
      pace: pace,
      wordsPerMinute: Math.round(avgWPM)
    },
    stressLevel: Math.round(avgStress),
    pitchVariation: average(validResults.map(r => r.pitchVariation || 0)),
    energyLevel: Math.round(average(validResults.map(r => r.energyLevel || 0))),
    overallAudioScore: Math.round((avgConfidence + avgEnthusiasm + avgClarity) / 3)
  };
};

/**
 * Calculate final score with weighted components
 * - 80%: AI text evaluation (transcript content)
 * - 10%: Video analysis (body language, emotions)
 * - 10%: Audio analysis (tone, clarity, confidence)
 */
const calculateFinalScore = (textScore, videoScore, audioScore) => {
  const weights = {
    text: 0.80,
    video: 0.10,
    audio: 0.10
  };

  const finalScore = (
    (textScore * weights.text) +
    (videoScore * weights.video) +
    (audioScore * weights.audio)
  );

  return Math.round(Math.max(0, Math.min(100, finalScore)));
};

/**
 * Mock video analysis (for development without Python services)
 */
const getMockVideoAnalysis = () => {
  console.log('🎭 Generating MOCK video analysis data');
  return {
    emotionScores: [
      { emotion: 'neutral', score: 0.6, timestamp: new Date() },
      { emotion: 'happy', score: 0.3, timestamp: new Date() },
      { emotion: 'confident', score: 0.1, timestamp: new Date() }
    ],
    eyeContactScore: 75,
    engagementScore: 80,
    confidenceScore: 70,
    overallVideoScore: 75,
    isMock: true,
    mockReason: 'Video analysis service not available'
  };
};

/**
 * Mock audio analysis (for development without Python services)
 */
const getMockAudioAnalysis = () => {
  console.log('🎭 Generating MOCK audio analysis data');
  return {
    toneAnalysis: {
      confidence: 72,
      enthusiasm: 68,
      clarity: 80,
      pace: 'moderate',
      wordsPerMinute: 140
    },
    stressLevel: 35,
    pitchVariation: 0.45,
    energyLevel: 70,
    overallAudioScore: 73,
    isMock: true,
    mockReason: 'Audio analysis service not available'
  };
};

/**
 * Helper: Calculate average
 */
const average = (numbers) => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
};

/**
 * Get analysis status for an interview
 */
const getAnalysisStatus = async (interviewId) => {
  const interview = await Interview.findById(interviewId).select('analysisComplete preliminaryScore finalScore analysis');
  
  if (!interview) {
    return { status: 'not-found' };
  }

  return {
    status: interview.analysisComplete ? 'complete' : 'processing',
    preliminaryScore: interview.preliminaryScore,
    finalScore: interview.finalScore,
    hasVideoAnalysis: !!interview.analysis?.videoAnalysis,
    hasAudioAnalysis: !!interview.analysis?.audioAnalysis,
    analyzedAt: interview.analysis?.videoAnalysis?.analyzedAt || null
  };
};

module.exports = {
  analyzeCompletedInterview,
  getAnalysisStatus,
  calculateFinalScore,
  analyzeVideo,
  analyzeAudio
};
