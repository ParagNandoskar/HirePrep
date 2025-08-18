// Scoring utilities for various assessments

// Calculate resume-job match score
const calculateResumeJobMatch = (resumeSkills, jobSkills) => {
  if (!resumeSkills || !jobSkills || jobSkills.length === 0) return 0;

  const resumeSkillNames = resumeSkills.map(skill => skill.name.toLowerCase());
  let totalScore = 0;
  let maxScore = 0;

  jobSkills.forEach(jobSkill => {
    const weight = jobSkill.required ? 2 : 1;
    maxScore += weight;

    const hasSkill = resumeSkillNames.includes(jobSkill.name.toLowerCase());
    if (hasSkill) {
      const resumeSkill = resumeSkills.find(rs => 
        rs.name.toLowerCase() === jobSkill.name.toLowerCase()
      );
      
      // Bonus for proficiency level
      let proficiencyMultiplier = 1;
      if (resumeSkill && resumeSkill.proficiency) {
        switch (resumeSkill.proficiency.toLowerCase()) {
          case 'expert': proficiencyMultiplier = 1.2; break;
          case 'advanced': proficiencyMultiplier = 1.1; break;
          case 'intermediate': proficiencyMultiplier = 1.0; break;
          case 'beginner': proficiencyMultiplier = 0.8; break;
          default: proficiencyMultiplier = 1.0;
        }
      }
      
      totalScore += weight * proficiencyMultiplier;
    }
  });

  return maxScore > 0 ? Math.min(100, (totalScore / maxScore) * 100) : 0;
};

// Calculate experience match score
const calculateExperienceMatch = (resumeExperience, jobRequirements) => {
  if (!resumeExperience || !jobRequirements.experience) return 50;

  const totalYears = resumeExperience.reduce((total, exp) => {
    const startYear = new Date(exp.startDate).getFullYear();
    const endYear = exp.endDate ? new Date(exp.endDate).getFullYear() : new Date().getFullYear();
    return total + (endYear - startYear);
  }, 0);

  const { minYears = 0, maxYears = 10 } = jobRequirements.experience;
  
  if (totalYears < minYears) {
    return Math.max(0, 50 - ((minYears - totalYears) * 10));
  } else if (totalYears > maxYears) {
    return Math.max(70, 100 - ((totalYears - maxYears) * 5));
  } else {
    return 100;
  }
};

// Calculate education match score
const calculateEducationMatch = (resumeEducation, jobEducation) => {
  if (!resumeEducation || !jobEducation) return 50;

  const hasRequiredDegree = resumeEducation.some(edu => 
    edu.degree && edu.degree.toLowerCase().includes(jobEducation.degree.toLowerCase())
  );

  const hasRequiredField = resumeEducation.some(edu => 
    edu.field && jobEducation.field && 
    edu.field.toLowerCase().includes(jobEducation.field.toLowerCase())
  );

  let score = 50;
  if (hasRequiredDegree) score += 30;
  if (hasRequiredField) score += 20;

  return Math.min(100, score);
};

// Calculate overall interview score
const calculateInterviewScore = (videoScore, audioScore, qaScore) => {
  const weights = {
    video: 0.3,
    audio: 0.3,
    qa: 0.4
  };

  return Math.round(
    (videoScore || 0) * weights.video +
    (audioScore || 0) * weights.audio +
    (qaScore || 0) * weights.qa
  );
};

// Calculate final candidate score
const calculateFinalScore = (resumeScore, interviewScore) => {
  const weights = {
    resume: 0.4,
    interview: 0.6
  };

  return Math.round(
    (resumeScore || 0) * weights.resume +
    (interviewScore || 0) * weights.interview
  );
};

// Calculate percentile rank
const calculatePercentile = (score, allScores) => {
  if (!allScores || allScores.length === 0) return 100;
  
  const sortedScores = allScores.sort((a, b) => a - b);
  const rank = sortedScores.filter(s => s < score).length;
  return Math.round((rank / sortedScores.length) * 100);
};

// Normalize scores to 0-100 scale
const normalizeScore = (score, min = 0, max = 100) => {
  return Math.max(0, Math.min(100, ((score - min) / (max - min)) * 100));
};

// Calculate confidence interval
const calculateConfidenceInterval = (scores, confidence = 0.95) => {
  if (!scores || scores.length === 0) return { lower: 0, upper: 100 };
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  
  const marginOfError = 1.96 * stdDev / Math.sqrt(scores.length); // 95% confidence
  
  return {
    lower: Math.max(0, mean - marginOfError),
    upper: Math.min(100, mean + marginOfError)
  };
};

module.exports = {
  calculateResumeJobMatch,
  calculateExperienceMatch,
  calculateEducationMatch,
  calculateInterviewScore,
  calculateFinalScore,
  calculatePercentile,
  normalizeScore,
  calculateConfidenceInterval
};
