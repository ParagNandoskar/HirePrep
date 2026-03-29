import { apiService } from './api';

/**
 * Generate AI questions based on job description
 * @param {string} jobDescription - The job description to analyze
 * @param {number} customQuestionsCount - Number of custom questions already added
 * @returns {Promise} Response with AI-generated questions
 */
export const generateAIQuestions = async (jobDescription, customQuestionsCount = 0) => {
  try {
    const response = await apiService.post('/interview/screening/generate-questions', {
      jobDescription,
      customQuestionsCount
    });
    return response.data;
  } catch (error) {
    console.error('Error generating AI questions:', error);
    throw error;
  }
};

/**
 * Submit screening interview responses
 * @param {string} applicationId - The application ID
 * @param {object} data - Interview submission data (jobId, responses, totalQuestions)
 * @returns {Promise} Response with interview results and score
 */
export const submitScreeningInterview = async (applicationId, data) => {
  try {
    const response = await apiService.post(`/interview/screening/${applicationId}/submit`, data);
    return response.data;
  } catch (error) {
    console.error('Error submitting screening interview:', error);
    throw error;
  }
};

/**
 * Get job-specific leaderboard
 * @param {string} jobId - The job ID
 * @returns {Promise} Response with leaderboard data and statistics
 */
export const getJobLeaderboard = async (jobId) => {
  try {
    const response = await apiService.get(`/interview/screening/leaderboard/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching job leaderboard:', error);
    throw error;
  }
};

export default {
  generateAIQuestions,
  submitScreeningInterview,
  getJobLeaderboard
};
