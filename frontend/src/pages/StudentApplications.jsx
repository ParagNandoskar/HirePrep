import React, { useState, useEffect } from 'react'
import { HiSearch, HiExternalLink, HiVideoCamera } from 'react-icons/hi'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { candidatesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const StudentApplications = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const startScreeningInterview = (application) => {
    // Navigate to AI Voice Interview with job details
    navigate('/student-dashboard/ai-voice-interview', {
      state: {
        jobId: application.job._id,
        applicationId: application._id,
        jobTitle: application.job.title,
        companyName: application.job.company?.companyName,
        jobDescription: application.job.description,
        isJobApplication: true,
        type: 'technical',
        role: application.job.title
      }
    })
  }

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await candidatesAPI.getApplications()
        
        console.log('DEBUG Frontend: Applications response:', response)
        
        // Fix: applications are in response.data.applications, not response.applications
        if (response.success && response.data?.applications) {
          setApplications(response.data.applications)
          setFilteredApplications(response.data.applications)
        } else if (response.applications) {
          // Fallback for old API format
          setApplications(response.applications)
          setFilteredApplications(response.applications)
        }
      } catch (error) {
        console.error('Error fetching applications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchApplications()
    }
  }, [user])

  useEffect(() => {
    filterApplications()
  }, [activeFilter, searchQuery, applications])

  const filterApplications = () => {
    let filtered = [...applications]

    // Filter by status
    if (activeFilter !== 'All') {
      filtered = filtered.filter(app => 
        app.status.toLowerCase() === activeFilter.toLowerCase()
      )
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(app => 
        app.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.job?.company?.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredApplications(filtered)
  }

  const getStatusColor = (status) => {
    const statusColors = {
      'applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'interviewing': 'bg-purple-100 text-purple-800 border-purple-200',
      'shortlisted': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200'
    }
    return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filters = ['All', 'Pending', 'Shortlisted', 'Rejected']

  if (isLoading) {
    return (
      <DashboardLayout 
        sidebarContent={<StudentSidebar />} 
        userType="student"
      >
        <div className="animate-pulse">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-20 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Applied Jobs</h2>
            <p className="text-sm text-gray-500">
              {filteredApplications.length} job{filteredApplications.length !== 1 ? 's' : ''} applied
            </p>
          </div>
          <p className="text-gray-500 text-sm">
            📋 Jobs you have applied
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg font-medium">No applications found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchQuery || activeFilter !== 'All' 
                ? 'Try adjusting your filters or search query' 
                : 'Start applying to jobs to see them here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApplications.map((application) => (
              <div
                key={application._id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200 group"
              >
                {/* Left: Job Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
                    {application.job?.title || 'Job Title Not Available'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="flex items-center">
                      <span className="font-medium mr-1">Company:</span>
                      {application.job?.company?.companyName || 'N/A'}
                    </span>
                    <span className="flex items-center">
                      <span className="font-medium mr-1">Applied:</span>
                      {formatDate(application.appliedAt)}
                    </span>
                    {application.job?.location && (
                      <span className="flex items-center">
                        <span className="font-medium mr-1">Location:</span>
                        {application.job.location.city && application.job.location.state 
                          ? `${application.job.location.city}, ${application.job.location.state}${application.job.location.country ? ', ' + application.job.location.country : ''}`
                          : application.job.location.country || application.job.location.type || 'N/A'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Status and Action */}
                <div className="flex items-center gap-3 ml-4">
                  {/* Screening Interview Button */}
                  {(application.status === 'pending' || application.status === 'applied') && !application.interviewCompleted && (
                    <button
                      onClick={() => startScreeningInterview(application)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
                    >
                      <HiVideoCamera className="w-5 h-5" />
                      <span>Take Screening Interview</span>
                    </button>
                  )}
                  
                  {application.interviewCompleted && (
                    <span className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 font-medium rounded-lg border border-green-200">
                      <HiVideoCamera className="w-5 h-5" />
                      <span>Interview Completed</span>
                    </span>
                  )}
                  
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(application.status)}`}>
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="View application details"
                  >
                    <HiExternalLink className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default StudentApplications
