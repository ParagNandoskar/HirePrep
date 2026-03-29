import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiPlus, HiPencil, HiTrash, HiEye, HiUsers, HiCalendar, HiLocationMarker, HiCurrencyDollar } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { jobsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const JobManagementEmployer = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [filteredJobs, setFilteredJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [jobToDelete, setJobToDelete] = useState(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filterStatus, searchQuery, jobs])

  const fetchJobs = async () => {
    try {
      setIsLoading(true)
      const response = await jobsAPI.getMyJobs({ limit: 100 })
      
      // API returns { success: true, data: { jobs: [...], pagination: {...} } }
      const jobs = response?.data?.jobs || response?.jobs || []
      
      setJobs(jobs)
      setFilteredJobs(jobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
      setFilteredJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...jobs]

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus)
    }

    // Filter by search query
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(job =>
        job.title?.toLowerCase().includes(normalizedQuery) ||
        [job.location?.city, job.location?.state, job.location?.country, job.location?.type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)
      )
    }

    setFilteredJobs(filtered)
  }

  const handleDeleteJob = async () => {
    if (!jobToDelete) return

    try {
      await jobsAPI.deleteJob(jobToDelete._id)
      setJobs(jobs.filter(job => job._id !== jobToDelete._id))
      setShowDeleteModal(false)
      setJobToDelete(null)
    } catch (error) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job. Please try again.')
    }
  }

  const confirmDelete = (job) => {
    setJobToDelete(job)
    setShowDeleteModal(true)
  }

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-red-100 text-red-800 border-red-200',
      draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paused: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || colors.active
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatSalary = (min, max, currency = 'USD') => {
    const hasMin = Number.isFinite(min) && min > 0
    const hasMax = Number.isFinite(max) && max > 0
    if (!hasMin && !hasMax) return 'Not specified'

    const formatAmount = (amount) => {
      try {
        const locale = currency === 'INR' ? 'en-IN' : 'en-US'
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0
        }).format(amount)
      } catch {
        return `${currency} ${Number(amount).toLocaleString('en-IN')}`
      }
    }

    if (hasMin && hasMax) {
      return `${formatAmount(min)} - ${formatAmount(max)}`
    }
    return hasMin ? `${formatAmount(min)}+` : `Up to ${formatAmount(max)}`
  }

  return (
    <DashboardLayout 
      sidebarContent={<EmployerSidebar />} 
      userType="employer"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Job Postings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage your active and past job postings
            </p>
          </div>
          <button
            onClick={() => navigate('/employer-dashboard/jobs/create')}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
          >
            <HiPlus className="w-5 h-5" />
            <span>Create New Job</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Jobs</p>
                <p className="text-3xl font-bold text-gray-900">{jobs.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <HiEye className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Active Jobs</p>
                <p className="text-3xl font-bold text-green-600">
                  {jobs.filter(j => j.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <HiCalendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Applicants</p>
                <p className="text-3xl font-bold text-purple-600">
                  {jobs.reduce((sum, job) => sum + (job.applicationsCount || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <HiUsers className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Closed Jobs</p>
                <p className="text-3xl font-bold text-red-600">
                  {jobs.filter(j => j.status === 'closed').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <HiTrash className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {['all', 'active', 'closed', 'draft'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    filterStatus === status
                      ? 'bg-blue-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center py-16">
              <HiEye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">No jobs found</p>
              <p className="text-gray-400 text-sm mb-6">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Create your first job posting to get started'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <button
                  onClick={() => navigate('/employer-dashboard/jobs/create')}
                  className="px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Create Your First Job
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredJobs.map((job) => (
                <div
                  key={job._id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {job.title}
                        </h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-4">
                        <div className="flex items-center text-gray-600">
                          <HiLocationMarker className="w-4 h-4 mr-2" />
                          {job.location?.city && job.location?.state 
                            ? `${job.location.city}, ${job.location.state}` 
                            : job.location?.type || 'Not specified'}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <HiCurrencyDollar className="w-4 h-4 mr-2" />
                          {formatSalary(
                            job.compensation?.salaryRange?.min,
                            job.compensation?.salaryRange?.max,
                            job.compensation?.salaryRange?.currency
                          )}
                        </div>
                        <div className="flex items-center text-gray-600">
                          <HiUsers className="w-4 h-4 mr-2" />
                          {job.applicationsCount || 0} Applicants
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.tags?.slice(0, 5).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-gray-500">
                        Posted: {formatDate(job.createdAt)} 
                        {job.applicationDeadline && (
                          <> • Deadline: {formatDate(job.applicationDeadline)}</>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => navigate(`/employer-dashboard/jobs/${job._id}`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <HiEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/employer-dashboard/jobs/${job._id}/edit`)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit Job"
                      >
                        <HiPencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => confirmDelete(job)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Job"
                      >
                        <HiTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Job Posting?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setJobToDelete(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteJob}
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

export default JobManagementEmployer
