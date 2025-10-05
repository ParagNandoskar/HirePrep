const axios = require('axios'); // NEW: Add Axios for microservice communication
const { getEmbeddingsModel } = require('../config/gemini');
// REMOVED: calculateResumeJobMatch, calculateExperienceMatch, calculateEducationMatch imports
// These functions are now handled by the Python NLP microservice

const PYTHON_NLP_SERVICE_URL = 'http://localhost:5001'; // NEW: Python NLP microservice URL

// NEW: Function to call Python NLP service for job matching
async function matchJobWithPythonNLP(resumeData, jobData) {
  try {
    const response = await axios.post(`${PYTHON_NLP_SERVICE_URL}/match-job`, {
      resume: resumeData,
      job: jobData
    }, {
      timeout: 15000, // 15 second timeout
    });
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.error || 'Python NLP service returned unsuccessful response');
    }
  } catch (error) {
    console.error('Error calling Python NLP job matching service:', error.message);
    // Return fallback/default scores if Python service fails
    return {
      overall_score: 0.5,
      skill_match: { score: 0.5, details: [] },
      experience_match: { score: 0.5, details: [] },
      education_match: { score: 0.5, details: [] }
    };
  }
}

class JobMatcherService {
  // Generate job embeddings
  async generateJobEmbeddings(jobData) {
    try {
      const model = getEmbeddingsModel();
      
      // Create comprehensive text representation of the job
      const jobText = this.createJobEmbeddingText(jobData);
      
      const result = await model.embedContent(jobText);
      return result.embedding.values;
    } catch (error) {
      console.error('Job embedding generation error:', error);
      throw new Error('Failed to generate job embeddings: ' + error.message);
    }
  }

  // Create text representation for job embeddings
  createJobEmbeddingText(jobData) {
    const parts = [];
    
    parts.push(`Job Title: ${jobData.title}`);
    parts.push(`Description: ${jobData.description}`);
    
    if (jobData.requirements && jobData.requirements.skills) {
      const skillsText = jobData.requirements.skills.map(skill => skill.name).join(', ');
      parts.push(`Required Skills: ${skillsText}`);
    }
    
    if (jobData.requirements && jobData.requirements.education) {
      parts.push(`Education: ${jobData.requirements.education.degree} in ${jobData.requirements.education.field}`);
    }
    
    if (jobData.requirements && jobData.requirements.experience) {
      const exp = jobData.requirements.experience;
      parts.push(`Experience: ${exp.minYears || 0}-${exp.maxYears || 10} years`);
    }
    
    if (jobData.tags && jobData.tags.length > 0) {
      parts.push(`Tags: ${jobData.tags.join(', ')}`);
    }
    
    return parts.join('. ');
  }

  // Calculate semantic similarity between resume and job
  cosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Find matching jobs for a student
  async findMatchingJobs(resume, jobs, limit = 10) {
    try {
      const matches = [];

      for (const job of jobs) {
        const matchScore = await this.calculateJobMatchScore(resume, job);
        
        matches.push({
          job,
          matchScore,
          details: matchScore.details
        });
      }

      // Sort by overall match score (descending)
      matches.sort((a, b) => b.matchScore.overall - a.matchScore.overall);

      return matches.slice(0, limit);
    } catch (error) {
      console.error('Job matching error:', error);
      throw new Error('Failed to find matching jobs: ' + error.message);
    }
  }

  // UPDATED: Calculate comprehensive job match score using hybrid approach
  async calculateJobMatchScore(resume, job) {
    try {
      // NEW: Use Python NLP service for rule-based scoring
      const pythonScores = await matchJobWithPythonNLP(resume.parsedData, job);
      
      // RETAINED: Calculate semantic similarity using Gemini embeddings
      let semanticScore = 0;
      if (resume.embedding && job.embedding) {
        const similarity = this.cosineSimilarity(resume.embedding, job.embedding);
        semanticScore = similarity * 100;
      }

      // UPDATED: Combine Python NLP scores with semantic similarity
      const weights = {
        skills: 0.35,        // Python NLP skill matching
        experience: 0.25,    // Python NLP experience matching  
        education: 0.15,     // Python NLP education matching
        semantic: 0.25       // Gemini semantic similarity (increased weight)
      };

      // Extract scores from Python NLP service
      const skillsScore = (pythonScores.skill_match?.score || 0) * 100;
      const experienceScore = (pythonScores.experience_match?.score || 0) * 100;
      const educationScore = (pythonScores.education_match?.score || 0) * 100;

      // Calculate weighted overall score
      const overall = Math.round(
        skillsScore * weights.skills +
        experienceScore * weights.experience +
        educationScore * weights.education +
        semanticScore * weights.semantic
      );

      return {
        overall,
        details: {
          skillsMatch: skillsScore,
          experienceMatch: experienceScore,
          educationMatch: educationScore,
          semanticSimilarity: semanticScore,
          // NEW: Include detailed breakdowns from Python service
          skillDetails: pythonScores.skill_match?.details || [],
          experienceDetails: pythonScores.experience_match?.details || [],
          educationDetails: pythonScores.education_match?.details || []
        }
      };
    } catch (error) {
      console.error('Match score calculation error:', error);
      throw new Error('Failed to calculate match score: ' + error.message);
    }
  }

  // Find matching candidates for a job
  async findMatchingCandidates(job, resumes, limit = 50) {
    try {
      const matches = [];

      for (const resume of resumes) {
        const matchScore = await this.calculateJobMatchScore(resume, job);
        
        matches.push({
          resume,
          student: resume.userId, // Assuming populated
          matchScore,
          details: matchScore.details
        });
      }

      // Sort by overall match score (descending)
      matches.sort((a, b) => b.matchScore.overall - a.matchScore.overall);

      return matches.slice(0, limit);
    } catch (error) {
      console.error('Candidate matching error:', error);
      throw new Error('Failed to find matching candidates: ' + error.message);
    }
  }

  // Get skill gap analysis
  getSkillGapAnalysis(resumeSkills, jobSkills) {
    const resumeSkillNames = (resumeSkills || []).map(skill => skill.name.toLowerCase());
    const missingSkills = [];
    const matchingSkills = [];
    const additionalSkills = [];

    // Find missing and matching skills
    (jobSkills || []).forEach(jobSkill => {
      const hasSkill = resumeSkillNames.includes(jobSkill.name.toLowerCase());
      if (hasSkill) {
        const resumeSkill = resumeSkills.find(rs => 
          rs.name.toLowerCase() === jobSkill.name.toLowerCase()
        );
        matchingSkills.push({
          skill: jobSkill.name,
          required: jobSkill.required,
          proficiency: resumeSkill ? resumeSkill.proficiency : 'unknown'
        });
      } else {
        missingSkills.push({
          skill: jobSkill.name,
          required: jobSkill.required,
          experience: jobSkill.experience
        });
      }
    });

    // Find additional skills not required by job
    resumeSkills.forEach(resumeSkill => {
      const isRequired = jobSkills.some(js => 
        js.name.toLowerCase() === resumeSkill.name.toLowerCase()
      );
      if (!isRequired) {
        additionalSkills.push(resumeSkill);
      }
    });

    return {
      missingSkills,
      matchingSkills,
      additionalSkills,
      matchPercentage: Math.round((matchingSkills.length / (jobSkills.length || 1)) * 100)
    };
  }

  // Generate improvement suggestions
  generateImprovementSuggestions(resume, job, matchScore) {
    const suggestions = [];
    
    if (matchScore.details.skillsMatch < 70) {
      const skillGap = this.getSkillGapAnalysis(
        resume.parsedData.skills,
        job.requirements.skills
      );
      
      if (skillGap.missingSkills.length > 0) {
        const requiredMissing = skillGap.missingSkills.filter(s => s.required);
        if (requiredMissing.length > 0) {
          suggestions.push({
            type: 'critical',
            category: 'skills',
            message: `Learn these required skills: ${requiredMissing.map(s => s.skill).join(', ')}`,
            priority: 'high'
          });
        }
        
        const optionalMissing = skillGap.missingSkills.filter(s => !s.required);
        if (optionalMissing.length > 0) {
          suggestions.push({
            type: 'improvement',
            category: 'skills',
            message: `Consider learning: ${optionalMissing.slice(0, 3).map(s => s.skill).join(', ')}`,
            priority: 'medium'
          });
        }
      }
    }
    
    if (matchScore.details.experienceMatch < 60) {
      suggestions.push({
        type: 'improvement',
        category: 'experience',
        message: 'Consider gaining more relevant work experience or highlighting transferable skills',
        priority: 'medium'
      });
    }
    
    if (matchScore.details.educationMatch < 60) {
      suggestions.push({
        type: 'improvement',
        category: 'education',
        message: 'Consider pursuing relevant certifications or additional education',
        priority: 'low'
      });
    }
    
    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}

module.exports = new JobMatcherService();
