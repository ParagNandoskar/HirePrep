import { apiService } from './api'

/**
 * Applications API Service
 * Handles all application-related API calls for students and employers
 */
export const applicationsService = {
  /**
   * Get all applications (context-aware: student's own or company's received)
   * @param {Object} params - Query params {page, limit, status, jobId}
   * @returns {Promise} List of applications
   */
  getApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/applications${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get application by ID
   * @param {string} applicationId - Application ID
   * @returns {Promise} Application details
   */
  getApplicationById: (applicationId) => {
    return apiService.get(`/applications/${applicationId}`)
  },

  /**
   * Apply to a job (Student only)
   * @param {Object} data - Application data {jobId, coverLetter, resumeId}
   * @returns {Promise} Application confirmation
   */
  applyToJob: (data) => {
    return apiService.post('/applications', data)
  },

  /**
   * Update application (Student: withdraw, Company: status change)
   * @param {string} applicationId - Application ID
   * @param {Object} data - Update data {status, notes}
   * @returns {Promise} Update confirmation
   */
  updateApplication: (applicationId, data) => {
    return apiService.put(`/applications/${applicationId}`, data)
  },

  /**
   * Delete/withdraw application (Student only)
   * @param {string} applicationId - Application ID
   * @returns {Promise} Deletion confirmation
   */
  deleteApplication: (applicationId) => {
    return apiService.delete(`/applications/${applicationId}`)
  },

  /**
   * Get application statistics
   * @returns {Promise} Application stats (total, pending, accepted, rejected)
   */
  getApplicationStats: () => {
    return apiService.get('/applications/stats')
  },

  /**
   * Get company's received applications (Company only)
   * @param {Object} params - Query params {page, limit, status, jobId, search}
   * @returns {Promise} Received applications
   */
  getCompanyApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/applications/company/all${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Update application status (Company only)
   * @param {string} applicationId - Application ID
   * @param {string} status - New status (pending, reviewed, shortlisted, rejected, accepted)
   * @returns {Promise} Update confirmation
   */
  updateApplicationStatus: (applicationId, status) => {
    return apiService.put(`/applications/company/${applicationId}/status`, { status })
  },

  /**
   * Bulk update application statuses (Company only)
   * @param {Array} applicationIds - Array of application IDs
   * @param {string} status - New status for all applications
   * @returns {Promise} Bulk update confirmation
   */
  bulkUpdateStatus: (applicationIds, status) => {
    return apiService.put('/applications/company/bulk-status', { 
      applicationIds, 
      status 
    })
  },

  /**
   * Get student's my applications (Student only)
   * @param {Object} params - Query params {page, limit, status}
   * @returns {Promise} Student's applications
   */
  getMyApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/applications/student/my-applications${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Withdraw application (Student only)
   * @param {string} applicationId - Application ID
   * @returns {Promise} Withdrawal confirmation
   */
  withdrawApplication: (applicationId) => {
    return apiService.post(`/applications/${applicationId}/withdraw`)
  },

  /**
   * Export applications to CSV (Company only)
   * @param {Object} params - Filter params {status, jobId, dateFrom, dateTo}
   * @returns {Promise} CSV file data
   */
  exportApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/applications/company/export${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * Get application timeline/activity
   * @param {string} applicationId - Application ID
   * @returns {Promise} Application activity timeline
   */
  getApplicationTimeline: (applicationId) => {
    return apiService.get(`/applications/${applicationId}/timeline`)
  }
}

export default applicationsService
