import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  HiArrowLeft, 
  HiLocationMarker, 
  HiCurrencyDollar, 
  HiUsers, 
  HiClock, 
  HiCalendar,
  HiBriefcase,
  HiAcademicCap,
  HiCheckCircle,
  HiPencil,
  HiTrash
} from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { jobsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const JobDetails = () => {
  const { user } = useAuth()
  const { jobId } = useParams()
  const navigate = useNavigate()
  
  const [job, setJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [applications, setApplications] = useState([])

  useEffect(() => {
    fetchJobDetails()
    fetchApplications()
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      setIsLoading(true)
      const response = await jobsAPI.getJob(jobId)
      if (response && response.job) {
        setJob(response.job)
      }
    } catch (error) {
      console.error('Error fetching job:', error)
      alert('Failed to load job details')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchApplications = async () => {
    try {
      const response = await jobsAPI.getJobApplications(jobId)
      if (response && response.applications) {
        setApplications(response.applications)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const handleDelete = async () => {
    try {
      await jobsAPI.deleteJob(jobId)
      alert('Job deleted successfully')
      navigate('/employer-dashboard/jobs')
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatSalary = (min, max, currency = 'USD') => {
    if (!min && !max) return 'Not specified'
    const symbol = currency === 'USD' ? '$' : currency
    if (min && max) {
      return `${symbol}${(min / 1000).toFixed(0)}K - ${symbol}${(max / 1000).toFixed(0)}K`
    }
    return min ? `${symbol}${(min / 1000).toFixed(0)}K+` : `Up to ${symbol}${(max / 1000).toFixed(0)}K`
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    return colors[status] || colors.draft
  }

  if (isLoading) {
    return (
      <DashboardLayout sidebarContent={<EmployerSidebar />} userType="employer">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!job) {
    return (
      <DashboardLayout sidebarContent={<EmployerSidebar />} userType="employer">
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">Job not found</p>
          <button
            onClick={() => navigate('/employer-dashboard/jobs')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Return to Job Management
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarContent={<EmployerSidebar />} userType="employer">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/employer-dashboard/jobs')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Jobs
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/employer-dashboard/jobs/${jobId}/edit`)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              <HiPencil className="w-5 h-5" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
            >
              <HiTrash className="w-5 h-5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Job Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.title}</h1>
              <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(job.status)}`}>
                {job.status?.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center text-gray-600">
              <HiLocationMarker className="w-5 h-5 mr-2" />
              <span>{job.location || 'Not specified'}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <HiCurrencyDollar className="w-5 h-5 mr-2" />
              <span>{formatSalary(job.compensation?.salaryMin, job.compensation?.salaryMax, job.compensation?.currency)}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <HiBriefcase className="w-5 h-5 mr-2" />
              <span className="capitalize">{job.jobType || 'Full-time'}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <HiUsers className="w-5 h-5 mr-2" />
              <span>{applications.length} Applicants</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center text-gray-600">
              <HiCalendar className="w-5 h-5 mr-2" />
              <span>Posted: {formatDate(job.createdAt)}</span>
            </div>
            {job.applicationDeadline && (
              <div className="flex items-center text-gray-600">
                <HiClock className="w-5 h-5 mr-2" />
                <span>Deadline: {formatDate(job.applicationDeadline)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Job Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </div>

        {/* Requirements */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
          
          {/* Skills */}
          {job.requirements?.skills && job.requirements.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requirements.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-medium"
                  >
                    <HiCheckCircle className="w-4 h-4" />
                    <span>{skill.name || skill}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {job.requirements?.education && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <HiAcademicCap className="w-5 h-5 mr-2" />
                Education
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  <span className="font-medium">{job.requirements.education.degree}</span>
                  {job.requirements.education.field && (
                    <span> in {job.requirements.education.field}</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Experience */}
          {job.requirements?.experience && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <HiBriefcase className="w-5 h-5 mr-2" />
                Experience
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  {job.requirements.experience.minYears} - {job.requirements.experience.maxYears} years
                </p>
                {job.requirements.experience.industries && job.requirements.experience.industries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {job.requirements.experience.industries.map((industry, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm">
                        {industry}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Work Location */}
          {job.requirements?.location && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Work Location</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 font-medium">{job.requirements.location.type}</p>
              </div>
            </div>
          )}
        </div>

        {/* Compensation & Benefits */}
        {job.compensation && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Compensation & Benefits</h2>
            
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Salary Range</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatSalary(job.compensation.salaryMin, job.compensation.salaryMax, job.compensation.currency)}
              </p>
            </div>

            {job.compensation.benefits && job.compensation.benefits.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {job.compensation.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-2 text-gray-700">
                      <HiCheckCircle className="w-5 h-5 text-green-600" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Applicants Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Applicants</h2>
            <button
              onClick={() => navigate('/employer-dashboard/applications', { state: { jobId } })}
              className="text-blue-600 hover:text-blue-800 font-semibold"
            >
              View All Applications →
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-600">{applications.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Shortlisted</p>
              <p className="text-2xl font-bold text-green-600">
                {applications.filter(app => app.status === 'shortlisted').length}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {applications.filter(app => app.status === 'pending').length}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">
                {applications.filter(app => app.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Job Posting?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{job.title}"? This action cannot be undone and will affect all applicants.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Job
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default JobDetails
