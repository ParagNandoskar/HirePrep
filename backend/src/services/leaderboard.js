const { calculateResumeJobMatch, calculateInterviewScore, calculateFinalScore, calculatePercentile } = require('../utils/scoring');
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
      // Resume-Job Match Score
      if (resume.parsedData && job.requirements) {
        scores.resumeMatchScore = calculateResumeJobMatch(
          resume.parsedData.skills,
          job.requirements.skills
        );
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
  async getLeaderboardWithDetails(jobId, page = 1, limit = 50) {
    try {
      const leaderboard = await Leaderboard.findOne({ jobId })
        .populate('jobId')
        .populate({
          path: 'candidates.studentId',
          select: 'name email profile avatar'
        })
        .populate({
          path: 'candidates.resumeId',
          select: 'parsedData.personalInfo parsedData.skills parsedData.experience'
        });

      if (!leaderboard) {
        throw new Error('Leaderboard not found');
      }

      // Paginate results
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCandidates = leaderboard.candidates.slice(startIndex, endIndex);

      return {
        jobId: leaderboard.jobId,
        totalCandidates: leaderboard.totalCandidates,
        averageScore: leaderboard.averageScore,
        topPercentile: leaderboard.topPercentile,
        candidates: paginatedCandidates,
        lastUpdated: leaderboard.lastUpdated,
        pagination: {
          current: page,
          total: Math.ceil(leaderboard.totalCandidates / limit),
          hasNext: endIndex < leaderboard.totalCandidates,
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
