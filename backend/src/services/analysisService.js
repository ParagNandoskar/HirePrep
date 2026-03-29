const axios = require('axios');
const Interview = require('../models/Interview');
const Leaderboard = require('../models/Leaderboard');
const interviewService = require('./interviewService');
const FormData = require('form-data');
const {
  VIDEO_SERVICE_URL,
  AUDIO_SERVICE_URL,
  MICROSERVICE_TIMEOUT_MS,
  withMicroserviceTimeout
} = require('../config/services');

/**
 * Analysis Service - Orchestrates video/audio analysis and leaderboard updates
 * 
 * This service:
 * 1. Processes video frames for emotion/engagement analysis
 * 2. Processes audio for voice quality/filler word analysis
 * 3. Aggregates analysis results
 * 4. Updates interview scores
 * 5. Updates job leaderboard rankings
 */
class AnalysisService {
  constructor() {
    this.videoServiceUrl = VIDEO_SERVICE_URL;
    this.audioServiceUrl = AUDIO_SERVICE_URL;
  }

  /**
   * Analyze video frames using Python video service
   * @param {Array<string>} videoFrames - Array of base64 encoded video frames
   * @param {string} interviewId - MongoDB interview ID
   * @param {string} candidateId - MongoDB user ID
   * @param {number} questionId - Question number
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeVideoFrames(videoFrames, interviewId, candidateId, questionId) {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🎥 VIDEO ANALYSIS REQUEST`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   Interview ID: ${interviewId}`);
      console.log(`   Candidate ID: ${candidateId}`);
      console.log(`   Question ID: ${questionId}`);
      console.log(`   Frames count: ${videoFrames?.length || 0}`);
      console.log(`   Service URL: ${this.videoServiceUrl}/analyze-video`);
      console.log(`${'='.repeat(70)}\n`);
      
      const response = await axios.post(`${this.videoServiceUrl}/analyze-video`, {
        videoData: videoFrames,
        interviewId: interviewId,
        candidateId: candidateId,
        questionId: questionId
      }, withMicroserviceTimeout(MICROSERVICE_TIMEOUT_MS));

      console.log(`\n✅ VIDEO ANALYSIS SUCCESS`);
      console.log(`   Overall Score: ${response.data.overallVideoScore || 0}/100`);
      console.log(`   Eye Contact: ${response.data.eyeContactScore || 0}/100`);
      console.log(`   Frames Analyzed: ${response.data.analysisMetadata?.framesAnalyzed || 0}`);
      console.log(`${'='.repeat(70)}\n`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`\n❌ VIDEO ANALYSIS FAILED`);
      console.error(`   Error: ${error.message}`);
      console.error(`   URL: ${this.videoServiceUrl}/analyze-video`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data)}`);
      }
      console.error(`${'='.repeat(70)}\n`);
      return {
        success: false,
        error: error.message,
        data: {
          overallVideoScore: 0,
          eyeContactScore: 0,
          engagementScore: 0,
          confidenceScore: 0,
          analysisMetadata: { framesAnalyzed: 0, fallback: true }
        }
      };
    }
  }

  /**
   * Analyze audio for voice quality and filler words
   * @param {string} audioBase64 - Base64 encoded audio
   * @param {string} transcript - Text transcript from speech-to-text
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeAudio(audioBase64, transcript = '') {
    try {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🎤 AUDIO ANALYSIS REQUEST`);
      console.log(`${'='.repeat(70)}`);
      console.log(`   Audio size: ${audioBase64?.length || 0} chars`);
      console.log(`   Transcript: ${transcript ? 'Yes (' + transcript.length + ' chars)' : 'No'}`);
      console.log(`   Service URL: ${this.audioServiceUrl}/analyze-audio`);
      console.log(`${'='.repeat(70)}\n`);
      
      const response = await axios.post(`${this.audioServiceUrl}/analyze-audio`, {
        audio_base64: audioBase64,
        transcript: transcript
      }, withMicroserviceTimeout(MICROSERVICE_TIMEOUT_MS));

      console.log(`\n✅ AUDIO ANALYSIS SUCCESS`);
      console.log(`   Voice Confidence: ${response.data.voice_confidence || 0}/100`);
      console.log(`   Speaking Rate: ${response.data.speaking_rate || 0} WPM`);
      console.log(`   Overall Score: ${response.data.overall_score || 0}/100`);
      console.log(`   Filler Words: ${response.data.filler_words?.count || 0}`);
      console.log(`${'='.repeat(70)}\n`);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`\n❌ AUDIO ANALYSIS FAILED`);
      console.error(`   Error: ${error.message}`);
      console.error(`   URL: ${this.audioServiceUrl}/analyze-audio`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data)}`);
      }
      console.error(`${'='.repeat(70)}\n`);
      
      return {
        success: false,
        error: error.message,
        data: {
          voice_confidence: 0,
          speaking_rate: 0,
          volume_consistency: 0,
          nervousness_score: 0,
          filler_words: { count: 0, percentage: 0 },
          overall_score: 0,
          fallback: true
        }
      };
    }
  }

  /**
   * Process a complete interview answer (video + audio + transcript)
   */
  async processInterviewAnswer(interviewId, candidateId, questionId, videoFrames, audioBase64, transcript) {
    console.log(`\n${'#'.repeat(70)}`);
    console.log(`📊 PROCESSING INTERVIEW ANSWER`);
    console.log(`${'#'.repeat(70)}`);
    console.log(`   Interview ID: ${interviewId}`);
    console.log(`   Candidate ID: ${candidateId}`);
    console.log(`   Question ID: ${questionId}`);
    console.log(`   Video Frames: ${videoFrames?.length || 0}`);
    console.log(`   Audio Data: ${audioBase64 ? 'Yes' : 'No'}`);
    console.log(`   Transcript: ${transcript ? 'Yes' : 'No'}`);
    console.log(`${'#'.repeat(70)}\n`);
    
    const results = {
      videoAnalysis: null,
      audioAnalysis: null,
      combinedScore: 0,
      timestamp: new Date()
    };

    try {
      // Run video and audio analysis in parallel
      const [videoResult, audioResult] = await Promise.all([
        videoFrames?.length > 0 ? this.analyzeVideoFrames(videoFrames, interviewId, candidateId, questionId) : Promise.resolve({ success: false }),
        audioBase64 ? this.analyzeAudio(audioBase64, transcript) : Promise.resolve({ success: false })
      ]);

      // Process video results
      if (videoResult.success && videoResult.data) {
        results.videoAnalysis = {
          overallScore: Math.round(videoResult.data.overallVideoScore || 0),
          eyeContact: Math.round(videoResult.data.eyeContactScore || 0),
          engagement: Math.round(videoResult.data.engagementScore || 0),
          confidence: Math.round(videoResult.data.confidenceScore || 0),
          metadata: videoResult.data.analysisMetadata || {}
        };
        console.log(`   ✅ Video analysis processed: ${results.videoAnalysis.overallScore}/100`);
      } else {
        console.log(`   ⚠️  Video analysis skipped or failed`);
      }

      // Process audio results
      if (audioResult.success && audioResult.data) {
        results.audioAnalysis = {
          voiceConfidence: Math.round(audioResult.data.voice_confidence || 0),
          speakingRate: audioResult.data.speaking_rate || 0,
          volumeConsistency: Math.round(audioResult.data.volume_consistency || 0),
          nervousness: Math.round(audioResult.data.nervousness_score || 0),
          fillerWords: audioResult.data.filler_words || {},
          overallScore: Math.round(audioResult.data.overall_score || 0)
        };
        console.log(`   ✅ Audio analysis processed: ${results.audioAnalysis.overallScore}/100`);
      } else {
        console.log(`   ⚠️  Audio analysis skipped or failed`);
      }

      // Calculate combined score (weighted average)
      const videoScore = results.videoAnalysis?.overallScore || 0;
      const audioScore = results.audioAnalysis?.overallScore || 0;
      
      // Weights: 50% video, 50% audio
      results.combinedScore = Math.round((videoScore + audioScore) / 2);

      console.log(`\n${'#'.repeat(70)}`);
      console.log(`✅ ANALYSIS COMPLETE`);
      console.log(`   Video Score: ${videoScore}/100`);
      console.log(`   Audio Score: ${audioScore}/100`);
      console.log(`   Combined Score: ${results.combinedScore}/100`);
      console.log(`${'#'.repeat(70)}\n`);
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      console.error(`\n❌ ERROR PROCESSING INTERVIEW ANSWER`);
      console.error(`   ${error.message}`);
      console.error(`${'#'.repeat(70)}\n`);
      
      return {
        success: false,
        error: error.message,
        data: results
      };
    }
  }

  /**
   * Update interview with analysis results and calculate final score
   * @param {string} interviewId - Interview ID
   * @returns {Promise<Object>} Updated interview
   */
  async finalizeInterview(interviewId) {
    try {
      console.log(`\n📝 Finalizing interview ${interviewId}`);
      
      const interview = await Interview.findById(interviewId).populate('jobId');
      if (!interview) {
        throw new Error('Interview not found');
      }

      // Aggregate all analysis data from conversation
      const videoScores = [];
      const audioScores = [];
      const qaScores = [];

      for (const entry of interview.conversation) {
        if (entry.type === 'answer' || entry.type === 'qa') {
          // Video analysis
          if (interview.analysis?.videoAnalysis) {
            videoScores.push(interview.analysis.videoAnalysis.overallVideoScore || 0);
          }
          
          // Audio analysis
          if (interview.analysis?.audioAnalysis) {
            audioScores.push(interview.analysis.audioAnalysis.overallAudioScore || 0);
          }
          
          // QA analysis (if available)
          if (entry.relevanceScore) {
            qaScores.push(entry.relevanceScore);
          }
        }
      }

      // Calculate average scores
      const avgVideoScore = videoScores.length > 0 
        ? Math.round(videoScores.reduce((a, b) => a + b, 0) / videoScores.length)
        : 0;
      
      const avgAudioScore = audioScores.length > 0 
        ? Math.round(audioScores.reduce((a, b) => a + b, 0) / audioScores.length)
        : 0;
      
      const avgQAScore = qaScores.length > 0 
        ? Math.round(qaScores.reduce((a, b) => a + b, 0) / qaScores.length)
        : 0;

      // Calculate overall score with weights
      // Video: 30%, Audio: 30%, QA: 40%
      const overallScore = Math.round(
        avgVideoScore * 0.3 + 
        avgAudioScore * 0.3 + 
        avgQAScore * 0.4
      );

      // Update interview
      interview.score = overallScore;
      interview.status = 'completed';
      interview.endTime = new Date();
      interview.analysisComplete = true;
      
      if (!interview.analysis) {
        interview.analysis = {};
      }
      
      interview.analysis.overallScore = overallScore;
      
      // Set individual scores if analysis exists
      if (interview.analysis.videoAnalysis) {
        interview.analysis.videoAnalysis.overallVideoScore = avgVideoScore;
      }
      if (interview.analysis.audioAnalysis) {
        interview.analysis.audioAnalysis.overallAudioScore = avgAudioScore;
      }
      if (interview.analysis.qaAnalysis) {
        interview.analysis.qaAnalysis.overallQAScore = avgQAScore;
      }

      await interview.save();

      console.log(`✅ Interview finalized: Overall=${overallScore} (Video=${avgVideoScore}, Audio=${avgAudioScore}, QA=${avgQAScore})`);

      // Update leaderboard
      await this.updateLeaderboard(interview);

      return {
        success: true,
        data: {
          interviewId: interview._id,
          overallScore,
          videoScore: avgVideoScore,
          audioScore: avgAudioScore,
          qaScore: avgQAScore
        }
      };
    } catch (error) {
      console.error('Error finalizing interview:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update leaderboard with interview results
   * @param {Object} interview - Interview document
   * @returns {Promise<void>}
   */
  async updateLeaderboard(interview) {
    try {
      console.log(`🏆 Updating leaderboard for job ${interview.jobId._id}`);
      
      // Find or create leaderboard for this job
      let leaderboard = await Leaderboard.findOne({ jobId: interview.jobId._id });
      
      if (!leaderboard) {
        leaderboard = new Leaderboard({
          jobId: interview.jobId._id,
          candidates: []
        });
      }

      // Find or add candidate entry
      let candidateEntry = leaderboard.candidates.find(
        c => c.studentId.toString() === interview.studentId.toString()
      );

      if (!candidateEntry) {
        candidateEntry = {
          studentId: interview.studentId,
          interviewId: interview._id,
          scores: {},
          analysis: {},
          status: 'pending'
        };
        leaderboard.candidates.push(candidateEntry);
      } else {
        candidateEntry.interviewId = interview._id;
      }

      // Update scores
      candidateEntry.scores = {
        videoAnalysisScore: interview.analysis?.videoAnalysis?.overallVideoScore || 0,
        audioAnalysisScore: interview.analysis?.audioAnalysis?.overallAudioScore || 0,
        qaScore: interview.analysis?.qaAnalysis?.overallQAScore || 0,
        overallScore: interview.score || 0
      };

      // Sort candidates by overall score (descending)
      leaderboard.candidates.sort((a, b) => 
        (b.scores.overallScore || 0) - (a.scores.overallScore || 0)
      );

      // Assign ranks
      leaderboard.candidates.forEach((candidate, index) => {
        candidate.rank = index + 1;
      });

      // Update metadata
      leaderboard.totalCandidates = leaderboard.candidates.length;
      leaderboard.averageScore = leaderboard.candidates.reduce(
        (sum, c) => sum + (c.scores.overallScore || 0), 0
      ) / leaderboard.totalCandidates;
      leaderboard.lastUpdated = new Date();

      await leaderboard.save();
      
      console.log(`✅ Leaderboard updated: ${leaderboard.totalCandidates} candidates, avg score ${Math.round(leaderboard.averageScore)}`);
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard for a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Leaderboard data
   */
  async getJobLeaderboard(jobId) {
    try {
      const Application = require('../models/Application');
      const Job = require('../models/Job');
      const Candidate = require('../models/Candidate');

      // Get job details
      const job = await Job.findById(jobId).populate('companyId', 'companyName');

      // Get ALL completed applications for this job, sorted by score descending
      const applications = await Application.find({
        jobId: jobId,
        interviewCompleted: true,
        screeningScore: { $exists: true, $ne: null }
      })
        .populate('candidateId', 'name email')
        .sort({ screeningScore: -1 })
        .lean();

      const totalCandidates = applications.length;
      const averageScore = totalCandidates > 0
        ? Math.round(applications.reduce((sum, app) => sum + (app.screeningScore || 0), 0) / totalCandidates)
        : 0;

      // Batch-fetch Candidate profiles (which store profileImage)
      const userIds = applications.map(app => app.candidateId?._id || app.candidateId).filter(Boolean);
      const candidateProfiles = await Candidate.find({ userId: { $in: userIds } })
        .select('userId profileImage')
        .lean();
      const profileImageMap = {};
      candidateProfiles.forEach(cp => {
        profileImageMap[String(cp.userId)] = cp.profileImage || null;
      });

      const candidates = applications.map((app, index) => {
        const userId = String(app.candidateId?._id || app.candidateId);
        return {
          _id: app._id,
          rank: index + 1,
          studentId: userId,
          name: app.candidateId?.name || 'Anonymous',
          email: app.candidateId?.email || '',
          avatar: profileImageMap[userId] || null,
          scores: {
            overallScore: app.screeningScore || 0,
            technicalScore: app.aiAnalysis?.scores?.technical || 0,
            communicationScore: app.aiAnalysis?.scores?.communication || 0,
            problemSolvingScore: app.aiAnalysis?.scores?.problemSolving || 0,
            culturalFitScore: app.aiAnalysis?.scores?.culturalFit || 0
          },
          overallScore: app.screeningScore || 0,
          percentile: totalCandidates > 1
            ? Math.round(((totalCandidates - index - 1) / (totalCandidates - 1)) * 100)
            : 100,
          status: app.status,
          interviewDate: app.interviewCompletedAt
        };
      });

      return {
        success: true,
        data: {
          jobId: jobId,
          jobTitle: job?.title || 'Unknown Job',
          company: job?.companyId?.companyName || job?.company || 'Unknown Company',
          totalCandidates,
          averageScore,
          lastUpdated: new Date(),
          candidates
        }
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return {
        success: true, // Return success with empty data instead of error
        data: {
          jobId: jobId,
          candidates: [],
          totalCandidates: 0,
          averageScore: 0,
          error: error.message
        }
      };
    }
  }

  /**
   * Get candidate's rank in a specific job
   * @param {string} jobId - Job ID
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Rank data
   */
  async getCandidateRank(jobId, studentId) {
    try {
      const leaderboard = await Leaderboard.findOne({ jobId });
      
      if (!leaderboard) {
        return { success: false, message: 'Leaderboard not found' };
      }

      const candidateEntry = leaderboard.candidates.find(
        c => c.studentId.toString() === studentId.toString()
      );

      if (!candidateEntry) {
        return { success: false, message: 'Candidate not found in leaderboard' };
      }

      return {
        success: true,
        data: {
          rank: candidateEntry.rank,
          totalCandidates: leaderboard.totalCandidates,
          overallScore: candidateEntry.scores.overallScore,
          percentile: Math.round((1 - (candidateEntry.rank - 1) / leaderboard.totalCandidates) * 100)
        }
      };
    } catch (error) {
      console.error('Error getting candidate rank:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new AnalysisService();
