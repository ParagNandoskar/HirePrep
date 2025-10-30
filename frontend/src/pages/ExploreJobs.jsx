import React, { useState, useEffect } from 'react'
import { HiSearch, HiLocationMarker, HiBookmark, HiClock, HiHeart } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { jobsAPI, candidatesAPI } from '../services/api'

const ExploreJobs = () => {
  const { user } = useAuth()
  const { addNotification, setLoading } = useApp()
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    datePosted: 'Anytime',
    jobType: {
      fullTime: false,
      partTime: false,
      internship: false,
      freelance: false
    },
    salaryRange: 'Custom',
    salaryMin: '',
    salaryMax: '',
    workMode: {
      onSite: false,
      hybrid: false,
      remote: false
    },
    level: '',
    skills: ''
  })

  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [candidateSkills, setCandidateSkills] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  })
  const [loading, setJobsLoading] = useState(false)
  const [showOnlyMatched, setShowOnlyMatched] = useState(true)
  const [useEnhancedMatching, setUseEnhancedMatching] = useState(false)

  // Load candidate skills on component mount
  useEffect(() => {
    loadCandidateSkills()
  }, [user])

  // Load jobs on component mount and when filters change
  useEffect(() => {
    loadJobs()
  }, [filters.search, filters.location, pagination.current, showOnlyMatched, useEnhancedMatching])

  // Filter jobs is now handled by backend, so this effect can be removed or simplified
  useEffect(() => {
    if (!showOnlyMatched) {
      // When skill matching is disabled, just show all loaded jobs
      setFilteredJobs(jobs)
    }
  }, [jobs, showOnlyMatched])

  const loadCandidateSkills = async () => {
    try {
      const response = await candidatesAPI.getProfile()
      
      if (response && response.skills) {
        // Extract skill names from skills array (could be objects or strings)
        const skillNames = response.skills.map(skill => 
          typeof skill === 'string' ? skill.toLowerCase() : skill.name?.toLowerCase()
        ).filter(Boolean)
        setCandidateSkills(skillNames)
      } else {
        setCandidateSkills([])
      }
    } catch (error) {
      console.error('Error loading candidate skills:', error)
      setCandidateSkills([])
    }
  }

  const loadJobs = async (resetPage = false) => {
    try {
      setJobsLoading(true)
      
      // Build query parameters
      const params = {
        page: resetPage ? 1 : pagination.current,
        limit: 10
      }

      if (filters.search) params.search = filters.search
      if (filters.location) params.location = filters.location
      if (filters.salaryMin) params.salaryMin = filters.salaryMin
      if (filters.salaryMax) params.salaryMax = filters.salaryMax
      if (filters.level) params.level = filters.level
      if (filters.skills) params.skills = filters.skills

      // Add job type filters
      const activeJobTypes = Object.entries(filters.jobType)
        .filter(([key, value]) => value)
        .map(([key]) => key)
      if (activeJobTypes.length > 0) {
        params.jobType = activeJobTypes[0] // For now, take the first one
      }

      let response;
      if (showOnlyMatched) {
        if (useEnhancedMatching) {
          // Use enhanced AI-powered matching
          response = await jobsAPI.getEnhancedMatchedJobs(params);
        } else {
          // Use basic skill-matched jobs endpoint
          response = await jobsAPI.getMatchedJobs(params);
        }
        if (response.candidateSkills) {
          setCandidateSkills(response.candidateSkills);
        }
      } else {
        // Use regular jobs endpoint
        response = await jobsAPI.getAllJobs(params);
      }
      
      setJobs(response.jobs || [])
      setPagination(response.pagination || { current: 1, pages: 1, total: 0 })
      
      // Update filteredJobs since we're now using backend filtering
      setFilteredJobs(response.jobs || [])
    } catch (error) {
      console.error('Error loading jobs:', error)
      addNotification({
        type: 'error',
        message: 'Failed to load jobs. Please try again.'
      })
    } finally {
      setJobsLoading(false)
    }
  }

  const handleApplyToJob = async (job) => {
    try {
      const response = await jobsAPI.applyToJob(job._id)
      
      addNotification({
        type: 'success',
        message: `Successfully applied to ${job.title}! Match score: ${response.matchScore}%`
      })
      
      // Optionally reload jobs to update application status
      loadJobs()
    } catch (error) {
      console.error('Apply error:', error)
      addNotification({
        type: 'error',
        message: error.message || 'Failed to apply to job. Please try again.'
      })
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, current: 1 }))
    loadJobs(true)
  }

  const handleFilterChange = (category, key, value) => {
    if (category === 'simple') {
      setFilters(prev => ({ ...prev, [key]: value }))
    } else {
      setFilters(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      }))
    }
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      location: '',
      datePosted: 'Anytime',
      jobType: {
        fullTime: false,
        partTime: false,
        internship: false,
        freelance: false
      },
      salaryRange: 'Custom',
      salaryMin: '',
      salaryMax: '',
      workMode: {
        onSite: false,
        hybrid: false,
        remote: false
      },
      level: '',
      skills: ''
    })
    setPagination(prev => ({ ...prev, current: 1 }))
    loadJobs(true)
  }

  const formatSalary = (compensation) => {
    if (!compensation) return 'Not specified'
    
    if (compensation.salaryRange) {
      const { min, max, currency = 'INR' } = compensation.salaryRange
      if (min && max) {
        return `${currency === 'INR' ? '₹' : '$'}${min}-${max} ${compensation.period || 'per year'}`
      }
    }
    
    return compensation.description || 'Competitive salary'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return '1 day ago'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return date.toLocaleDateString()
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-8">Find your dream Job</h1>
          
          <div className="flex gap-8  ">
            {/* Filters Section */}
            <div className="w-80  border border-gray-200 rounded-2xl">
              {/* Filter Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 ">
                <h2 className="font-medium text-gray-800">Filter</h2>
                <button 
                  onClick={clearAllFilters}
                  className="text-red-500 text-sm hover:text-red-600 transition-colors"
                >
                  Clear all
                </button>
              </div>

              {/* Date Posted Filter */}
              <div className=" p-4">
                <h3 className="font-medium text-gray-800 mb-3">Date posted</h3>
                <select 
                  value={filters.datePosted}
                  onChange={(e) => handleFilterChange('simple', 'datePosted', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ backgroundColor: '#0035661A' }}
                >
                  <option value="Anytime">Anytime</option>
                  <option value="Last 24 hours">Last 24 hours</option>
                  <option value="Last 3 days">Last 3 days</option>
                  <option value="Last week">Last week</option>
                  <option value="Last month">Last month</option>
                </select>
              </div>

              <hr className="mx-4 text-gray-200" />

              {/* Job Type Filter */}
              <div className=" p-4">
                <h3 className="font-medium text-gray-800 mb-3">Job type</h3>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(filters.jobType).map(([key, value]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleFilterChange('jobType', key, e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
               <hr className="mx-4 text-gray-200" />

              {/* Salary Range Filter */}
              <div className=" p-4">
                <h3 className="font-medium text-gray-800 mb-3">Salary Range</h3>
                <div className="space-y-2">
                  {['Under 1 LPA', '1 LPA - 10 LPA', '10 LPA - 25 LPA', 'Above 25 LPA', 'Custom'].map((range) => (
                    <label key={range} className="flex items-center">
                      <input
                        type="radio"
                        name="salaryRange"
                        checked={filters.salaryRange === range}
                        onChange={() => handleFilterChange('simple', 'salaryRange', range)}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700">{range}</span>
                    </label>
                  ))}
                </div>
                {filters.salaryRange === 'Custom' && (
                  <div className="mt-3">
                    <input
                      type="range"
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      min="0"
                      max="50"
                      defaultValue="25"
                    />
                  </div>
                )}
              </div>
               <hr className="mx-4 text-gray-200" />

              {/* Work Mode Filter */}
              <div className=" p-4">
                <h3 className="font-medium text-gray-800 mb-3">Work mode</h3>
                <div className="space-y-2">
                  {Object.entries(filters.workMode).map(([key, value]) => (
                    <label key={key} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => handleFilterChange('workMode', key, e.target.checked)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {key === 'onSite' ? 'On-site' : key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
               <hr className="mx-4 text-gray-200" />

              {/* Experience Level Filter */}
              <div className=" p-4">
                <h3 className="font-medium text-gray-800 mb-3">Experience Level</h3>
                <div className="space-y-2">
                  {['entry', 'mid', 'senior', 'lead'].map((level) => (
                    <label key={level} className="flex items-center">
                      <input
                        type="radio"
                        name="experienceLevel"
                        checked={filters.level === level}
                        onChange={() => setFilters(prev => ({ ...prev, level: level }))}
                        className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{level} Level</span>
                    </label>
                  ))}
                </div>
              </div>
               <hr className="mx-4 text-gray-200" />

              {/* Skills Filter */}
              <div className=" p-4">
                <h3 className="font-medium text-gray-800 mb-3">Skills</h3>
                <input
                  type="text"
                  placeholder="e.g. React, Python, AWS"
                  value={filters.skills}
                  onChange={(e) => setFilters(prev => ({ ...prev, skills: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{ backgroundColor: '#0035661A' }}
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
              </div>
               <hr className="mx-4 text-gray-200" />

              {/* Skill Match Filter */}
              <div className="p-4">
                <h3 className="font-medium text-gray-800 mb-3">Smart Matching</h3>
                <label className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    checked={showOnlyMatched}
                    onChange={(e) => setShowOnlyMatched(e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Show only jobs matching my skills
                  </span>
                </label>
                
                {/* Enhanced AI Matching Toggle */}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={useEnhancedMatching}
                    onChange={(e) => setUseEnhancedMatching(e.target.checked)}
                    disabled={!showOnlyMatched}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 disabled:opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    Use AI-powered matching
                    <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                      Beta
                    </span>
                  </span>
                </label>
                
                <p className="text-xs text-gray-500 mt-1">
                  {showOnlyMatched 
                    ? (useEnhancedMatching 
                        ? "Advanced NLP analysis for better job-candidate matching"
                        : "Filter jobs based on skills from your uploaded resume")
                    : "Enable skill matching to use AI-powered features"
                  }
                </p>
              </div>
            </div>

            {/* Jobs Section */}
            <div className="flex-1">
              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-4 mb-6 p-4 border border-gray-200 rounded-lg">
                <div className="flex-1 relative">
                  <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search job title or keyword"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: '#0035661A' }}
                  />
                </div>
                <div className="w-64 relative">
                  <HiLocationMarker className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Location"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ backgroundColor: '#0035661A' }}
                  />
                </div>
                <Button type="submit" variant="secondary" size="lg" className="px-6" disabled={loading}>
                  {loading ? 'Searching...' : 'Find Jobs'}
                </Button>
              </form>

              {/* Results Count and Matching Info */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">
                    {loading ? 'Loading...' : `${pagination.total} Job Results`}
                  </p>
                  
                  {/* Show matching criteria when using skill filtering */}
                  {showOnlyMatched && !loading && (
                    <div className="text-sm text-gray-500">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                        {useEnhancedMatching ? 'AI-powered' : 'Basic'} matching • Min 30% skill match
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Additional info message */}
                {showOnlyMatched && !loading && pagination.total === 0 && (
                  <p className="text-orange-600 text-sm mt-2">
                    No jobs found with at least 30% skill match. Try uploading a resume or adding more skills to your profile.
                  </p>
                )}
              </div>

              {/* Job Listings */}
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500">No jobs found. Try adjusting your filters.</p>
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div key={job._id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                              {job.company?.logo ? (
                                <img src={job.company.logo} alt={job.company.companyName} className="w-8 h-8 rounded" />
                              ) : (
                                <span className="text-lg font-semibold text-gray-600">
                                  {job.company?.companyName?.[0] || 'C'}
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-800">{job.title}</h3>
                              <div className="flex items-center flex-wrap gap-x-3 gap-y-2 text-sm text-gray-600">
                                <span>• {job.company?.companyName || 'Company'}</span>
                                <span>• {job.jobDetails?.type || 'Full time'}</span>
                                <span>• {formatSalary(job.compensation)}</span>
                                <span>• {job.jobDetails?.level || 'Entry level'}</span>
                                <span>{job.location?.city || job.location?.state || 'Remote'}</span>
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                  {job.status === 'active' ? 'Actively hiring' : job.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApplyToJob(job)}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            Apply
                          </button>
                          <button
                            className="p-2 rounded-lg transition-colors bg-gray-100 text-gray-400 hover:bg-gray-200"
                          >
                            <HiHeart className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Skill Match Information */}
                      {candidateSkills.length > 0 && (job.skillMatch || job.nlpMatch) && (
                        <div className={`mb-4 p-3 rounded-lg border ${
                          job.nlpMatch 
                            ? 'bg-purple-50 border-purple-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${
                              job.nlpMatch ? 'text-purple-800' : 'text-blue-800'
                            }`}>
                              {job.nlpMatch ? (
                                <>
                                  AI Match: {Math.round(job.nlpMatch.overallScore)}%
                                  <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                                    AI
                                  </span>
                                  {job.nlpMatch.overallScore >= 70 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                      Excellent Match
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  Skill Match: {job.skillMatch.percentage}%
                                  {job.skillMatch.percentage >= 70 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                      Strong Match
                                    </span>
                                  )}
                                  {job.skillMatch.percentage >= 30 && job.skillMatch.percentage < 70 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                                      Good Match
                                    </span>
                                  )}
                                </>
                              )}
                            </span>
                            {job.skillMatch && (
                              <span className={`text-xs ${
                                job.nlpMatch ? 'text-purple-600' : 'text-blue-600'
                              }`}>
                                {job.skillMatch.matchedSkills.length} of {job.requirements?.skills?.length || 0} required skills
                              </span>
                            )}
                          </div>

                          {/* Enhanced NLP breakdown */}
                          {job.nlpMatch && job.nlpMatch.breakdown && (
                            <div className="flex gap-4 mb-2 text-xs">
                              <span className="text-purple-700">
                                Skills: {Math.round(job.nlpMatch.breakdown.skills)}%
                              </span>
                              <span className="text-purple-700">
                                Experience: {Math.round(job.nlpMatch.breakdown.experience)}%
                              </span>
                              <span className="text-purple-700">
                                Education: {Math.round(job.nlpMatch.breakdown.education)}%
                              </span>
                            </div>
                          )}

                          {/* Show matched skills */}
                          {job.skillMatch && job.skillMatch.matchedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {job.skillMatch.matchedSkills.slice(0, 3).map((skill, index) => (
                                <span
                                  key={index}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    job.nlpMatch 
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.skillMatch.matchedSkills.length > 3 && (
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  job.nlpMatch 
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  +{job.skillMatch.matchedSkills.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Show NLP recommendations */}
                          {job.nlpMatch && job.nlpMatch.recommendations && job.nlpMatch.recommendations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-purple-200">
                              <p className="text-xs text-purple-600 mb-1">Recommendations:</p>
                              <p className="text-xs text-purple-700">
                                {job.nlpMatch.recommendations[0]}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {job.description || 'No description available.'}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {job.requirements?.skills?.slice(0, 4).map((skill, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 text-sm rounded-full border border-gray-200"
                              style={{ backgroundColor: '#0035661A' }}
                            >
                              {skill.name || skill}
                            </span>
                          ))}
                          {job.requirements?.skills?.length > 4 && (
                            <span className="text-sm text-gray-500">
                              +{job.requirements.skills.length - 4} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <HiClock className="w-4 h-4 mr-1" />
                          {formatDate(job.postedDate || job.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {!loading && filteredJobs.length > 0 && pagination.pages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPagination(prev => ({ ...prev, current: prev.current - 1 }))
                        loadJobs()
                      }}
                      disabled={pagination.current === 1}
                      className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Page {pagination.current} of {pagination.pages}
                    </span>
                    
                    <button
                      onClick={() => {
                        setPagination(prev => ({ ...prev, current: prev.current + 1 }))
                        loadJobs()
                      }}
                      disabled={pagination.current === pagination.pages}
                      className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ExploreJobs
