// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// Simple cache to prevent duplicate requests
const requestCache = new Map()
const cacheTimeout = 2000 // 2 seconds

const getCacheKey = (endpoint, options) => {
  return `${endpoint}_${JSON.stringify(options || {})}`
}

// API service functions
export const apiService = {
  // Generic request method
  async request(endpoint, options = {}) {
    const cacheKey = getCacheKey(endpoint, options)
    
    // Check if the same request is already in progress
    if (requestCache.has(cacheKey)) {
      console.log('🔄 Returning cached request for:', endpoint)
      return requestCache.get(cacheKey)
    }
    
    const url = `${API_BASE_URL}${endpoint}`
    
    const token = localStorage.getItem('authToken')
    
    // Base configuration
    const config = {
      ...options,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
    }

    // Set Content-Type header ONLY if a JSON body is present and not an upload
    const isJsonBody = config.method !== 'GET' && config.method !== 'DELETE' && config.body && !(config.body instanceof FormData)
    
    if (isJsonBody) {
      config.headers['Content-Type'] = 'application/json'
    }

    // Create the request promise and cache it to prevent duplicates
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config)
        
        // Handle 401 response first
        if (response.status === 401) {
          // AuthContext handles logout/redirect via its global check
          const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }))
          const error = new Error(errorData.message || 'Authentication failed')
          error.status = 401
          error.isAuthError = true
          throw error
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Request failed' }))
          
          // Don't log 404 errors for resume endpoints as they're expected when no resume exists
          const isResumeNotFound = response.status === 404 && endpoint.includes('/resumes')
          
          if (!isResumeNotFound) {
            console.error('API request failed:', errorData.message || `HTTP error! status: ${response.status}`)
          }
          
          const error = new Error(errorData.message || `HTTP error! status: ${response.status}`)
          error.status = response.status
          throw error
        }
        
        // Handle cases where response might be empty (e.g., successful delete with 204)
        if (response.status === 204) {
          return { success: true, message: 'Resource deleted successfully' }
        }
        
        const data = await response.json()
        return data
      } catch (error) {
        // Don't log 404 errors for resume endpoints as they're expected when no resume exists
        const isResumeNotFound = error.message?.includes('No resume found') || 
                                (error.message?.includes('404') && endpoint.includes('/resumes'))
        
        if (!isResumeNotFound) {
          console.error('API request failed:', error)
        }
        throw error
      } finally {
        // Remove from cache after completion to allow future requests
        setTimeout(() => {
          requestCache.delete(cacheKey)
        }, cacheTimeout)
      }
    })()
    
    // Cache the promise to prevent duplicate simultaneous requests
    requestCache.set(cacheKey, requestPromise)
    
    return requestPromise
  },

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options
    })
  },

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    })
  },

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    })
  },

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    })
  },

  // File upload request (for resumes, images, etc.)
  async uploadFile(endpoint, formData, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const token = localStorage.getItem('authToken')
    
    const config = {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        // FIX: Removed Content-Type header entirely. 
        // The browser sets 'multipart/form-data' automatically for FormData.
        ...options.headers 
      },
      body: formData,
      ...options
    }

    try {
      const response = await fetch(url, config)
      
      if (response.status === 401) {
        // FIX: Removed direct window.location redirect. AuthContext handles this.
        const errorData = await response.json().catch(() => ({ message: 'Unauthorized' }))
        throw new Error(errorData.message || 'Unauthorized')
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('File upload failed:', error)
      throw error
    }
  }
}

// Authentication API
export const authAPI = {
  register: (userData) => apiService.post('/auth/register', userData),
  login: (credentials) => apiService.post('/auth/login', credentials),
  getProfile: () => apiService.get('/auth/profile'),
  refreshToken: () => apiService.post('/auth/refresh-token'),
  
  // Helper methods for token management
  setToken: (token) => {
    if (token && token !== 'undefined') {
      localStorage.setItem('authToken', token)
    } else {
      localStorage.removeItem('authToken')
    }
  },
  
  getToken: () => {
    const token = localStorage.getItem('authToken')
    if (!token || token === 'undefined' || token === 'null') {
      return null
    }
    return token
  },
  
  removeToken: () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  },
  
  removeUser: () => {
    localStorage.removeItem('user')
  },
  
  // Clean up corrupted localStorage data
  cleanup: () => {
    const token = localStorage.getItem('authToken')
    const user = localStorage.getItem('user')
    
    if (token === 'undefined' || token === 'null') {
      localStorage.removeItem('authToken')
    }
    
    if (user === 'undefined' || user === 'null') {
      localStorage.removeItem('user')
    }
  },
  
  setUser: (user) => {
    if (user && user !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user))
    } else {
      localStorage.removeItem('user')
    }
  },
  
  getUser: () => {
    const user = localStorage.getItem('user')
    
    if (!user || user === 'undefined' || user === 'null') {
      return null
    }
    
    try {
      const parsedUser = JSON.parse(user)
      return parsedUser
    } catch (error) {
      localStorage.removeItem('user')
      return null
    }
  }
}

// Jobs API
export const jobsAPI = {
  getAllJobs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/jobs${queryString ? `?${queryString}` : ''}`)
  },
  getMatchedJobs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/jobs/matched${queryString ? `?${queryString}` : ''}`)
  },
  getEnhancedMatchedJobs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/jobs/enhanced-matched${queryString ? `?${queryString}` : ''}`)
  },
  getJob: (id) => apiService.get(`/jobs/${id}`),
  createJob: (jobData) => apiService.post('/jobs', jobData),
  updateJob: (id, jobData) => apiService.put(`/jobs/${id}`, jobData),
  deleteJob: (id) => apiService.delete(`/jobs/${id}`),
  getMyJobs: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/jobs/company/my-jobs${queryString ? `?${queryString}` : ''}`)
  },
  applyToJob: (jobId) => apiService.post(`/jobs/${jobId}/apply`),
  getJobApplications: (jobId, params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/jobs/${jobId}/applications${queryString ? `?${queryString}` : ''}`)
  }
}

// Resume API
export const resumeAPI = {
  getResumes: () => apiService.get('/resumes'),
  uploadResume: (file) => {
    const formData = new FormData()
    formData.append('resume', file)
    return apiService.uploadFile('/resumes/upload', formData)
  },
  syncSkills: async () => {
    try {
      // First check if resumes exist to avoid 404 error
      const resumesResponse = await apiService.get('/resumes')
      const resumes = resumesResponse?.data?.resumes || []
      
      if (!resumes || resumes.length === 0) {
        // Return a structured response indicating no resume available
        return { 
          success: false, 
          message: 'No resume available to sync skills from',
          noResume: true 
        }
      }
      
      // If resume exists, proceed with sync
      return apiService.post('/resumes/sync-skills')
    } catch (error) {
      if (error.message?.includes('No resume found') || error.message?.includes('404')) {
        return { 
          success: false, 
          message: 'No resume available to sync skills from',
          noResume: true 
        }
      }
      throw error
    }
  },
  deleteResume: (id) => apiService.delete(`/resumes/${id}`),
  getResumeByUserId: (userId) => apiService.get(`/resumes/${userId}`),
  getResumeSignedUrl: (userId) => apiService.get(`/resumes/${userId}/signed-url`),
  viewResume: (id) => `${API_BASE_URL}/resumes/view/${id}`,
  downloadResume: (candidateId) => apiService.get(`/resumes/download/${candidateId}`),
  reprocessResume: (candidateId) => apiService.post(`/resumes/reprocess/${candidateId}`)
}

// Candidates API
export const candidatesAPI = {
  getProfile: () => apiService.get('/candidates/profile'),
  updateProfile: (profileData) => apiService.put('/candidates/profile', profileData),
  uploadProfileImage: (file) => {
    const formData = new FormData()
    formData.append('profileImage', file)
    return apiService.uploadFile('/candidates/upload-avatar', formData)
  },
  getApplications: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/candidates/applications${queryString ? `?${queryString}` : ''}`)
  },
  updateApplication: (applicationId, status) => 
    apiService.put(`/candidates/applications/${applicationId}`, { status }),
  getDashboardStats: () => apiService.get('/candidates/dashboard-stats'),
  getJobRecommendations: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return apiService.get(`/candidates/job-recommendations${queryString ? `?${queryString}` : ''}`)
  }
}

// Companies API  
export const companiesAPI = {
  getProfile: () => apiService.get(`/companies/profile?_t=${Date.now()}`), // Add cache busting
  updateProfile: (profileData) => apiService.put('/companies/profile', profileData),
  uploadLogo: (file) => {
    const formData = new FormData()
    formData.append('logo', file)
    return apiService.uploadFile('/companies/upload-logo', formData)
  },
  getDashboardStats: () => apiService.get('/companies/dashboard-stats'),
  getJobApplications: (jobId) => apiService.get(`/companies/applications/${jobId}`),
  updateApplicationStatus: (applicationId, status) => 
    apiService.put(`/companies/applications/${applicationId}/status`, { status })
}

// Keep existing legacy APIs for backward compatibility
export const interviewAPI = {
  getInterviews: () => apiService.get('/interviews'),
  createInterview: (data) => apiService.post('/interviews', data),
  getInterview: (id) => apiService.get(`/interviews/${id}`),
  updateInterview: (id, data) => apiService.put(`/interviews/${id}`, data),
  deleteInterview: (id) => apiService.delete(`/interviews/${id}`)
}

export const userAPI = {
  getProfile: () => candidatesAPI.getProfile(),
  updateProfile: (data) => candidatesAPI.updateProfile(data),
  login: (credentials) => authAPI.login(credentials),
  register: (userData) => authAPI.register(userData),
  logout: () => {
    authAPI.removeToken()
    return Promise.resolve()
  }
}