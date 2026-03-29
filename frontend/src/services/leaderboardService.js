import { apiService } from './api'

/**
 * Leaderboard API Service
 * Handles all leaderboard and ranking-related API calls
 */
export const leaderboardService = {
  /**
   * Get global student leaderboard
   * @param {Object} params - Query params {page, limit, category, timeframe}
   * @returns {Promise} Leaderboard data with rankings
   */
  getGlobalLeaderboard: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/leaderboard/students${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get leaderboard for a specific job
   * @param {string} jobId - Job ID
   * @param {Object} params - Query params
   * @returns {Promise} Job-specific leaderboard
   */
  getJobLeaderboard: (jobId, params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/leaderboard/${jobId}${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get leaderboard statistics
   * @param {string} jobId - Job ID
   * @returns {Promise} Leaderboard stats
   */
  getLeaderboardStats: (jobId) => {
    return apiService.get(`/leaderboard/${jobId}/stats`)
  },

  /**
   * Get current candidate's position in leaderboard
   * @param {string} jobId - Job ID
   * @param {string} studentId - Student ID
   * @returns {Promise} Candidate position and rank
   */
  getCandidatePosition: (jobId, studentId) => {
    return apiService.get(`/leaderboard/${jobId}/candidate/${studentId}/position`)
  },

  /**
   * Update candidate status in leaderboard (Company only)
   * @param {string} jobId - Job ID
   * @param {string} studentId - Student ID
   * @param {Object} data - Status update data
   * @returns {Promise} Update confirmation
   */
  updateCandidateStatus: (jobId, studentId, data) => {
    return apiService.put(`/leaderboard/${jobId}/candidate/${studentId}/status`, data)
  },

  /**
   * Compare multiple candidates (Company only)
   * @param {string} jobId - Job ID
   * @param {Object} data - Comparison data {candidateIds: []}
   * @returns {Promise} Comparison results
   */
  compareCandidates: (jobId, data) => {
    return apiService.post(`/leaderboard/${jobId}/compare-candidates`, data)
  },

  /**
   * Generate leaderboard for a job (Company only)
   * @param {string} jobId - Job ID
   * @returns {Promise} Generated leaderboard
   */
  generateLeaderboard: (jobId) => {
    return apiService.post(`/leaderboard/${jobId}/generate`)
  },

  /**
   * Get top performers across platform
   * @param {Object} params - Query params {limit, category}
   * @returns {Promise} Top performers list
   */
  getTopPerformers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/leaderboard/analytics/top-performers${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get user's ranking history
   * @param {string} userId - User ID (optional, defaults to current user)
   * @returns {Promise} Ranking history over time
   */
  getRankingHistory: (userId = 'me') => {
    return apiService.get(`/leaderboard/history/${userId}`)
  },

  /**
   * Get user's achievements and badges
   * @returns {Promise} User achievements
   */
  getUserAchievements: () => {
    return apiService.get('/leaderboard/achievements/my-achievements')
  }
}

export default leaderboardService
