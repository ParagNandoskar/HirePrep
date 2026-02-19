import { apiService } from './api'

/**
 * Interview API Service
 * Handles all interview-related API calls
 */
export const interviewService = {
  /**
   * Start a new interview
   * @param {Object} data - Interview data {jobId, type, duration, difficulty, role}
   * @returns {Promise} Interview data with questions
   */
  startInterview: (data) => {
    return apiService.post('/interview/start', data)
  },

  /**
   * Get interview details by ID
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Interview details
   */
  getInterview: (interviewId) => {
    return apiService.get(`/interview/${interviewId}`)
  },

  /**
   * Submit an answer for a question
   * @param {string} interviewId - Interview ID
   * @param {Object} data - Answer data {questionId, answer, duration}
   * @returns {Promise} Submission response
   */
  submitAnswer: (interviewId, data) => {
    return apiService.post(`/interview/${interviewId}/submit-answer`, data)
  },

  /**
   * Analyze video frames for emotion detection
   * @param {string} interviewId - Interview ID
   * @param {Object} data - Video data {videoData, timestamp}
   * @returns {Promise} Video analysis results
   */
  analyzeVideo: (interviewId, data) => {
    return apiService.post(`/interview/${interviewId}/analyze-video`, data)
  },

  /**
   * Analyze audio for speech quality
   * @param {string} interviewId - Interview ID
   * @param {Object} data - Audio data {audioData, timestamp}
   * @returns {Promise} Audio analysis results
   */
  analyzeAudio: (interviewId, data) => {
    return apiService.post(`/interview/${interviewId}/analyze-audio`, data)
  },

  /**
   * Finish the interview and get final results
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Final interview results with scores
   */
  finishInterview: (interviewId) => {
    return apiService.post(`/interview/${interviewId}/finish`)
  },

  /**
   * Cancel an ongoing interview
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Cancellation confirmation
   */
  cancelInterview: (interviewId) => {
    return apiService.post(`/interview/${interviewId}/cancel`)
  },

  /**
   * Get interview history for the current student
   * @param {Object} params - Query params {page, limit, status, type}
   * @returns {Promise} List of past interviews
   */
  getInterviewHistory: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/interview/history/my-interviews${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get questions for an interview
   * @param {string} interviewId - Interview ID
   * @returns {Promise} List of interview questions
   */
  getInterviewQuestions: (interviewId) => {
    return apiService.get(`/interview/${interviewId}/questions`)
  },

  /**
   * Get detailed results for a completed interview
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Detailed results with breakdown
   */
  getInterviewResults: (interviewId) => {
    return apiService.get(`/interview/${interviewId}/results`)
  },

  /**
   * Upload video recording for an interview
   * @param {string} interviewId - Interview ID
   * @param {Blob} videoBlob - Video recording blob
   * @returns {Promise} Upload confirmation
   */
  uploadRecording: async (interviewId, videoBlob) => {
    const formData = new FormData()
    formData.append('video', videoBlob, 'interview-recording.webm')
    
    return apiService.uploadFile(`/interview/${interviewId}/upload-recording`, formData)
  }
}

export default interviewService
