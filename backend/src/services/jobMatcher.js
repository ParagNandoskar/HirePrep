const { getEmbeddingsModel } = require('../config/gemini');
const { calculateResumeJobMatch, calculateExperienceMatch, calculateEducationMatch } = require('../utils/scoring');

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

  // Calculate comprehensive job match score
  async calculateJobMatchScore(resume, job) {
    try {
      const scores = {
        skills: 0,
        experience: 0,
        education: 0,
        semantic: 0
      };

      const weights = {
        skills: 0.4,
        experience: 0.25,
        education: 0.15,
        semantic: 0.2
      };

      // Calculate skills match
      if (resume.parsedData && resume.parsedData.skills && job.requirements && job.requirements.skills) {
        scores.skills = calculateResumeJobMatch(
          resume.parsedData.skills,
          job.requirements.skills
        );
      }

      // Calculate experience match
      if (resume.parsedData && resume.parsedData.experience && job.requirements) {
        scores.experience = calculateExperienceMatch(
          resume.parsedData.experience,
          job.requirements
        );
      }

      // Calculate education match
      if (resume.parsedData && resume.parsedData.education && job.requirements && job.requirements.education) {
        scores.education = calculateEducationMatch(
          resume.parsedData.education,
          job.requirements.education
        );
      } else {
        scores.education = 70; // Default score if education not specified
      }

      // Calculate semantic similarity
      if (resume.embedding && job.embedding) {
        const similarity = this.cosineSimilarity(resume.embedding, job.embedding);
        scores.semantic = similarity * 100;
      }

      // Calculate weighted overall score
      const overall = Math.round(
        scores.skills * weights.skills +
        scores.experience * weights.experience +
        scores.education * weights.education +
        scores.semantic * weights.semantic
      );

      return {
        overall,
        details: {
          skillsMatch: scores.skills,
          experienceMatch: scores.experience,
          educationMatch: scores.education,
          semanticSimilarity: scores.semantic
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
