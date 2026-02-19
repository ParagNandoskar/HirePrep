// REMOVED: calculateResumeJobMatch import (Now in Python NLP service)
const { calculateInterviewScore, calculateFinalScore, calculatePercentile } = require('../utils/scoring');
const Resume = require('../models/Resume');
const Interview = require('../models/Interview');
const Leaderboard = require('../models/Leaderboard');
const User = require('../models/User');

class LeaderboardService {
  // Generate or update leaderboard for a specific job
  async generateLeaderboard(jobId) {
    try {
      // Find all interviews for this job
      const interviews = await Interview.find({ 
        jobId, 
        status: 'completed',
        'analysis.overallScore': { $exists: true }
      }).populate('studentId').populate('jobId');

      if (interviews.length === 0) {
        throw new Error('No completed interviews found for this job');
      }

      // Get or create leaderboard
      let leaderboard = await Leaderboard.findOne({ jobId });
      if (!leaderboard) {
        leaderboard = new Leaderboard({ jobId, candidates: [] });
      }

      const candidates = [];

      for (const interview of interviews) {
        try {
          // Get student's resume
          const resume = await Resume.findOne({ 
            userId: interview.studentId._id,
            isProcessed: true
          });

          if (!resume) continue;

          // Calculate scores
          const scores = await this.calculateCandidateScores(
            resume,
            interview,
            interview.jobId
          );

          // Check if candidate already exists in leaderboard
          const existingCandidateIndex = leaderboard.candidates.findIndex(
            c => c.studentId.toString() === interview.studentId._id.toString()
          );

          const candidateData = {
            studentId: interview.studentId._id,
            resumeId: resume._id,
            interviewId: interview._id,
            scores,
            analysis: await this.generateCandidateAnalysis(resume, interview, interview.jobId),
            status: 'pending'
          };

          if (existingCandidateIndex >= 0) {
            // Update existing candidate if new score is better
            if (scores.overallScore > leaderboard.candidates[existingCandidateIndex].scores.overallScore) {
              leaderboard.candidates[existingCandidateIndex] = candidateData;
            }
          } else {
            candidates.push(candidateData);
          }
        } catch (error) {
          console.error(`Error processing candidate ${interview.studentId._id}:`, error);
          continue;
        }
      }

      // Add new candidates to leaderboard
      leaderboard.candidates.push(...candidates);

      // Calculate ranks and percentiles
      await this.calculateRanksAndPercentiles(leaderboard);

      // Save updated leaderboard
      await leaderboard.save();

      return await this.getLeaderboardWithDetails(jobId);
    } catch (error) {
      console.error('Leaderboard generation error:', error);
      throw new Error('Failed to generate leaderboard: ' + error.message);
    }
  }

  // Calculate comprehensive scores for a candidate
  async calculateCandidateScores(resume, interview, job) {
    const scores = {
      resumeMatchScore: 0,
      videoAnalysisScore: 0,
      audioAnalysisScore: 0,
      qaScore: 0,
      overallScore: 0
    };

    try {
      // Resume-Job Match Score - now comes from Python NLP service analysis
      if (resume.parsedData && resume.parsedData.jobMatchScores) {
        // Use pre-calculated job match score from Python NLP service
        const jobMatchScore = resume.parsedData.jobMatchScores.find(score => 
          score.jobId.toString() === job._id.toString()
        );
        scores.resumeMatchScore = jobMatchScore ? jobMatchScore.overall : 0;
      } else {
        // Fallback: use a basic calculation if no Python NLP scores available
        scores.resumeMatchScore = 50; // Default neutral score
      }

      // Video Analysis Score
      if (interview.analysis && interview.analysis.videoAnalysis) {
        scores.videoAnalysisScore = interview.analysis.videoAnalysis.overallVideoScore || 0;
      }

      // Audio Analysis Score
      if (interview.analysis && interview.analysis.audioAnalysis) {
        scores.audioAnalysisScore = interview.analysis.audioAnalysis.overallAudioScore || 0;
      }

      // Q&A Score
      if (interview.analysis && interview.analysis.qaAnalysis) {
        scores.qaScore = interview.analysis.qaAnalysis.overallQAScore || 0;
      }

      // Calculate overall interview score
      const interviewScore = calculateInterviewScore(
        scores.videoAnalysisScore,
        scores.audioAnalysisScore,
        scores.qaScore
      );

      // Calculate final overall score
      scores.overallScore = calculateFinalScore(scores.resumeMatchScore, interviewScore);

      return scores;
    } catch (error) {
      console.error('Score calculation error:', error);
      return scores;
    }
  }

  // Generate detailed analysis for a candidate
  async generateCandidateAnalysis(resume, interview, job) {
    const analysis = {
      strengths: [],
      weaknesses: [],
      skillsMatch: [],
      recommendations: []
    };

    try {
      // Skills matching analysis
      if (resume.parsedData && resume.parsedData.skills && job.requirements && job.requirements.skills) {
        const resumeSkills = resume.parsedData.skills.map(s => s.name.toLowerCase());
        
        job.requirements.skills.forEach(jobSkill => {
          const hasSkill = resumeSkills.includes(jobSkill.name.toLowerCase());
          const studentSkill = resume.parsedData.skills.find(s => 
            s.name.toLowerCase() === jobSkill.name.toLowerCase()
          );
          
          analysis.skillsMatch.push({
            skill: jobSkill.name,
            required: jobSkill.required,
            studentHas: hasSkill,
            proficiency: studentSkill ? studentSkill.proficiency : null
          });
        });
      }

      // Extract strengths from various analyses
      if (interview.analysis) {
        // Video analysis strengths
        if (interview.analysis.videoAnalysis) {
          const videoAnalysis = interview.analysis.videoAnalysis;
          if (videoAnalysis.confidenceScore > 75) {
            analysis.strengths.push('Demonstrates high confidence during interview');
          }
          if (videoAnalysis.eyeContactScore > 70) {
            analysis.strengths.push('Maintains good eye contact');
          }
          if (videoAnalysis.engagementScore > 80) {
            analysis.strengths.push('Shows excellent engagement and enthusiasm');
          }
        }

        // Audio analysis strengths
        if (interview.analysis.audioAnalysis) {
          const audioAnalysis = interview.analysis.audioAnalysis;
          if (audioAnalysis.toneAnalysis.clarity > 75) {
            analysis.strengths.push('Speaks clearly and articulates well');
          }
          if (audioAnalysis.toneAnalysis.confidence > 70) {
            analysis.strengths.push('Voice conveys confidence');
          }
          if (audioAnalysis.stressLevel < 30) {
            analysis.strengths.push('Remains calm under pressure');
          }
        }

        // Q&A analysis strengths
        if (interview.analysis.qaAnalysis && interview.analysis.qaAnalysis.responses) {
          const avgRelevance = interview.analysis.qaAnalysis.responses.reduce(
            (sum, r) => sum + (r.relevanceScore || 0), 0
          ) / interview.analysis.qaAnalysis.responses.length;
          
          if (avgRelevance > 75) {
            analysis.strengths.push('Provides highly relevant and focused answers');
          }
        }
      }

      // Resume-based strengths
      if (resume.aiAnalysis && resume.aiAnalysis.strengths) {
        analysis.strengths.push(...resume.aiAnalysis.strengths);
      }

      // Identify weaknesses
      if (interview.analysis) {
        // Video analysis weaknesses
        if (interview.analysis.videoAnalysis) {
          const videoAnalysis = interview.analysis.videoAnalysis;
          if (videoAnalysis.confidenceScore < 50) {
            analysis.weaknesses.push('Could improve confidence presentation');
          }
          if (videoAnalysis.eyeContactScore < 40) {
            analysis.weaknesses.push('Needs to improve eye contact');
          }
        }

        // Audio analysis weaknesses
        if (interview.analysis.audioAnalysis) {
          const audioAnalysis = interview.analysis.audioAnalysis;
          if (audioAnalysis.toneAnalysis.clarity < 50) {
            analysis.weaknesses.push('Could speak more clearly');
          }
          if (audioAnalysis.stressLevel > 70) {
            analysis.weaknesses.push('Shows signs of high stress during interview');
          }
        }
      }

      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis, resume, interview, job);

      return analysis;
    } catch (error) {
      console.error('Analysis generation error:', error);
      return analysis;
    }
  }

  // Generate improvement recommendations
  generateRecommendations(analysis, resume, interview, job) {
    const recommendations = [];

    try {
      // Skill-based recommendations
      const missingSkills = analysis.skillsMatch.filter(sm => sm.required && !sm.studentHas);
      if (missingSkills.length > 0) {
        recommendations.push(`Focus on learning: ${missingSkills.map(ms => ms.skill).join(', ')}`);
      }

      // Interview performance recommendations
      if (interview.analysis) {
        if (interview.analysis.videoAnalysis && interview.analysis.videoAnalysis.confidenceScore < 60) {
          recommendations.push('Practice mock interviews to build confidence');
        }
        
        if (interview.analysis.audioAnalysis && interview.analysis.audioAnalysis.toneAnalysis.clarity < 60) {
          recommendations.push('Work on speaking clearly and at an appropriate pace');
        }

        if (interview.analysis.qaAnalysis && interview.analysis.qaAnalysis.overallQAScore < 60) {
          recommendations.push('Prepare more structured answers using the STAR method');
        }
      }

      // Resume improvement recommendations
      if (resume.aiAnalysis && resume.aiAnalysis.improvements) {
        recommendations.push(...resume.aiAnalysis.improvements);
      }

      // General career recommendations
      if (resume.aiAnalysis && resume.aiAnalysis.careerSuggestions) {
        recommendations.push(...resume.aiAnalysis.careerSuggestions.slice(0, 2));
      }

      return recommendations.slice(0, 5); // Limit to top 5 recommendations
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return recommendations;
    }
  }

  // Calculate ranks and percentiles
  async calculateRanksAndPercentiles(leaderboard) {
    try {
      // Sort candidates by overall score (descending)
      leaderboard.candidates.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

      // Assign ranks
      leaderboard.candidates.forEach((candidate, index) => {
        candidate.rank = index + 1;
      });

      // Calculate percentiles and identify top performers
      const allScores = leaderboard.candidates.map(c => c.scores.overallScore);
      leaderboard.topPercentile = [];

      leaderboard.candidates.forEach(candidate => {
        const percentile = calculatePercentile(candidate.scores.overallScore, allScores);
        
        if (percentile >= 90) {
          leaderboard.topPercentile.push({
            studentId: candidate.studentId,
            score: candidate.scores.overallScore,
            percentile
          });
        }
      });

      return leaderboard;
    } catch (error) {
      console.error('Rank calculation error:', error);
      throw error;
    }
  }

  // Get leaderboard with full details
  async getLeaderboardWithDetails(jobId, page = 1, limit = 100) {
    try {
      // Generate leaderboard on-the-fly from Application data
      const Application = require('../models/Application');
      const Job = require('../models/Job');

      // Get the job details
      const job = await Job.findById(jobId).populate('companyId', 'companyName');
      if (!job) {
        throw new Error('Job not found');
      }

      // Get all completed applications for this job
      const applications = await Application.find({
        jobId: jobId,
        interviewCompleted: true,
        screeningScore: { $exists: true, $ne: null }
      })
        .populate('candidateId', 'name email profile avatar')
        .sort({ screeningScore: -1 }) // Sort by score descending
        .lean();

      console.log(`📊 Found ${applications.length} completed interviews for job ${jobId}`);

      if (applications.length === 0) {
        // Return empty leaderboard instead of throwing error
        return {
          jobId: job,
          totalCandidates: 0,
          averageScore: 0,
          topPercentile: [],
          top10Recommended: [],
          candidates: [],
          lastUpdated: new Date(),
          pagination: {
            current: page,
            total: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      // Calculate average score
      const totalScore = applications.reduce((sum, app) => sum + (app.screeningScore || 0), 0);
      const averageScore = totalScore / applications.length;

      // Map applications to candidate format with rankings
      const candidates = applications.map((app, index) => ({
        _id: app._id,
        studentId: app.candidateId,
        rank: index + 1,
        scores: {
          overallScore: app.screeningScore,
          technicalScore: app.aiAnalysis?.scores?.technical || 0,
          communicationScore: app.aiAnalysis?.scores?.communication || 0,
          problemSolvingScore: app.aiAnalysis?.scores?.problemSolving || 0,
          culturalFitScore: app.aiAnalysis?.scores?.culturalFit || 0
        },
        percentile: ((applications.length - index) / applications.length) * 100,
        status: app.status,
        interviewDate: app.interviewCompletedAt,
        isTopPerformer: index < 10, // Mark top 10 as recommended to company
        isRecommendedToCompany: index < 10 // Explicit flag for company
      }));

      // Get top 10% for top percentile
      const topPercentileCount = Math.max(1, Math.ceil(applications.length * 0.1));
      const topPercentile = candidates.slice(0, topPercentileCount);
      
      // Get top 10 recommended candidates for company
      const top10Recommended = candidates.slice(0, 10);

      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCandidates = candidates.slice(startIndex, endIndex);

      return {
        jobId: job,
        totalCandidates: applications.length,
        averageScore: Math.round(averageScore * 100) / 100,
        topPercentile,
        top10Recommended, // Top 10 candidates recommended to company
        candidates: paginatedCandidates,
        lastUpdated: new Date(),
        pagination: {
          current: page,
          total: Math.ceil(applications.length / limit),
          hasNext: endIndex < applications.length,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Leaderboard retrieval error:', error);
      throw new Error('Failed to get leaderboard details: ' + error.message);
    }
  }

  // Get candidate rank and analysis
  async getCandidatePosition(jobId, studentId) {
    try {
      const leaderboard = await Leaderboard.findOne({ jobId });
      
      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      const candidate = leaderboard.candidates.find(
        c => c.studentId.toString() === studentId.toString()
      );

      if (!candidate) {
        throw new Error('Candidate not found in leaderboard');
      }

      const allScores = leaderboard.candidates.map(c => c.scores.overallScore);
      const percentile = calculatePercentile(candidate.scores.overallScore, allScores);

      return {
        rank: candidate.rank,
        totalCandidates: leaderboard.totalCandidates,
        scores: candidate.scores,
        percentile,
        analysis: candidate.analysis,
        status: candidate.status
      };
    } catch (error) {
      console.error('Candidate position error:', error);
      throw new Error('Failed to get candidate position: ' + error.message);
    }
  }

  // Update candidate status (for company actions)
  async updateCandidateStatus(jobId, studentId, newStatus) {
    try {
      const leaderboard = await Leaderboard.findOne({ jobId });
      
      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      const candidateIndex = leaderboard.candidates.findIndex(
        c => c.studentId.toString() === studentId.toString()
      );

      if (candidateIndex === -1) {
        throw new Error('Candidate not found in leaderboard');
      }

      leaderboard.candidates[candidateIndex].status = newStatus;
      leaderboard.lastUpdated = new Date();

      await leaderboard.save();

      return leaderboard.candidates[candidateIndex];
    } catch (error) {
      console.error('Status update error:', error);
      throw new Error('Failed to update candidate status: ' + error.message);
    }
  }
}

module.exports = new LeaderboardService();
