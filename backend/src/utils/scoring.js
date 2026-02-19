// Scoring utilities for various assessments

// REMOVED: calculateResumeJobMatch (Now in Python NLP service)
// REMOVED: calculateExperienceMatch (Now in Python NLP service)
// REMOVED: calculateEducationMatch (Now in Python NLP service)

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
  // REMOVED: calculateResumeJobMatch,
  // REMOVED: calculateExperienceMatch,
  // REMOVED: calculateEducationMatch,
  calculateInterviewScore,
  calculateFinalScore,
  calculatePercentile,
  normalizeScore,
  calculateConfidenceInterval
};
