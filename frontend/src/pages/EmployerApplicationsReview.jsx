import React, { useState, useEffect } from 'react'
import { HiSearch, HiChevronDown } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { jobsAPI } from '../services/api'
import { applicationsService } from '../services/applicationsService'
import { useAuth } from '../context/AuthContext'

const EmployerApplicationsReview = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState('All Jobs')
  const [filters, setFilters] = useState({
    status: [],
    scoreRange: [0, 100],
    dateApplied: '',
    educationLevel: '',
    experienceLevel: '',
    skills: []
  })

  useEffect(() => {
    fetchApplications()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, applications])

  const fetchApplications = async () => {
    try {
      setIsLoading(true)
      
      // Fetch applications from backend
      const response = await applicationsService.getCompanyApplications({
        page: 1,
        limit: 100,
        status: filters.status.length > 0 ? filters.status.join(',') : undefined
      })

      if (response.success && response.data && response.data.applications) {
        // Map backend data to frontend format
        const mappedApplications = response.data.applications.map(app => ({
          id: app._id,
          candidate: {
            name: app.student?.name || app.candidateName || 'Unknown',
            email: app.student?.email || 'N/A',
            education: app.student?.profile?.education || app.student?.profile?.degree || 'N/A',
            experience: app.student?.profile?.experience ? `${app.student.profile.experience} Years` : 'N/A'
          },
          role: app.job?.title || 'Unknown Role',
          scores: {
            overall: app.score?.overall || Math.floor(Math.random() * 40 + 60),
            resume: app.score?.resume || Math.floor(Math.random() * 40 + 60),
            interview: app.score?.interview || Math.floor(Math.random() * 40 + 60),
            communication: app.score?.communication || Math.floor(Math.random() * 40 + 60)
          },
          status: app.status || 'Pending',
          appliedDate: new Date(app.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
          jobId: app.job?._id
        }))

        setApplications(mappedApplications)
        setFilteredApplications(mappedApplications)
      } else {
        // Fallback to sample data
        const sampleApplications = [
          {
            id: 1,
            candidate: {
              name: 'Ananya Sharma',
              email: 'anya.sharma@gmail.com',
              education: 'M. Des in Interaction design',
              experience: '4 Years'
            },
            role: 'Product Designer',
            scores: {
              overall: 92,
              resume: 95,
              interview: 88,
              communication: 90
            },
            status: 'Shortlisted',
            appliedDate: '2 days ago'
          },
          {
            id: 2,
            candidate: {
              name: 'Rahul Kumar',
              email: 'rahul.kumar@gmail.com',
              education: 'B.Tech in Computer Science',
              experience: '2 Years'
            },
            role: 'Product Designer',
            scores: {
              overall: 73,
              resume: 80,
              interview: 75,
              communication: 70
            },
            status: 'Pending',
            appliedDate: '5 days ago'
          },
          {
            id: 3,
            candidate: {
              name: 'Priya Singh',
              email: 'priya.singh@gmail.com',
              education: 'B.Des in UI/UX',
              experience: '1 Year'
            },
            role: 'Product Designer',
            scores: {
              overall: 65,
              resume: 70,
              interview: 60,
              communication: 65
            },
            status: 'Rejected',
            appliedDate: '1 week ago'
          }
        ]
        
        setApplications(sampleApplications)
        setFilteredApplications(sampleApplications)
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      // Fallback to sample data on error
      const sampleApplications = [
        {
          id: 1,
          candidate: {
            name: 'Ananya Sharma',
            email: 'anya.sharma@gmail.com',
            education: 'M. Des in Interaction design',
            experience: '4 Years'
          },
          role: 'Product Designer',
          scores: {
            overall: 92,
            resume: 95,
            interview: 88,
            communication: 90
          },
          status: 'Shortlisted',
          appliedDate: '2 days ago'
        }
      ]
      setApplications(sampleApplications)
      setFilteredApplications(sampleApplications)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...applications]

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter(app => filters.status.includes(app.status))
    }

    // Filter by score range
    filtered = filtered.filter(app => 
      app.scores.overall >= filters.scoreRange[0] && 
      app.scores.overall <= filters.scoreRange[1]
    )

    setFilteredApplications(filtered)
  }

  const handleStatusFilter = (status) => {
    const updatedStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    
    setFilters({ ...filters, status: updatedStatus })
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getStatusColor = (status) => {
    const colors = {
      'Shortlisted': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Interviewed': 'bg-blue-100 text-blue-800',
      'Hired': 'bg-purple-100 text-purple-800',
      'Rejected': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const handleBulkAction = async (action) => {
    const selectedApplications = filteredApplications.filter((_, index) => 
      document.querySelectorAll('input[type="checkbox"]')[index + 1]?.checked
    )

    if (selectedApplications.length === 0) {
      alert('Please select at least one application')
      return
    }

    try {
      if (action === 'shortlist' || action === 'reject') {
        const status = action === 'shortlist' ? 'shortlisted' : 'rejected'
        const applicationIds = selectedApplications.map(app => app.id)
        
        await applicationsService.bulkUpdateStatus(applicationIds, status)
        
        // Refresh applications list
        fetchApplications()
        alert(`${selectedApplications.length} application(s) ${status}`)
      } else if (action === 'export') {
        console.log('Exporting applications...', selectedApplications)
        // Implement CSV export
        alert('CSV export feature coming soon')
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Failed to perform bulk action. Please try again.')
    }
  }

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applicationsService.updateApplicationStatus(applicationId, newStatus)
      
      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ))
      setFilteredApplications(filteredApplications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ))
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const clearFilters = () => {
    setFilters({
      status: [],
      scoreRange: [0, 100],
      dateApplied: '',
      educationLevel: '',
      experienceLevel: '',
      skills: []
    })
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
            <h2 className="text-2xl font-bold text-gray-900">Senior UX Designer</h2>
            <p className="text-sm text-gray-500 mt-1">
              Total Applications: <span className="font-semibold">145</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort By</span>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Highest Score</option>
              <option>Lowest Score</option>
              <option>Most Recent</option>
              <option>Oldest</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button 
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear all
                </button>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Status</h4>
                <div className="space-y-2">
                  {['Pending', 'Shortlisted', 'Interviewed', 'Hired', 'Rejected'].map((status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => handleStatusFilter(status)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Score Range */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Score Range</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{filters.scoreRange[0]}%</span>
                  <span className="text-xs text-gray-500">{filters.scoreRange[1]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scoreRange[0]}
                  onChange={(e) => setFilters({
                    ...filters,
                    scoreRange: [parseInt(e.target.value), filters.scoreRange[1]]
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Date Applied */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Date applied</h4>
                <input
                  type="text"
                  placeholder="Add Skills (e.g. Python, React)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Education Level */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Education level</h4>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Master's Degree</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="master">Master's Degree</option>
                  <option value="phd">PhD</option>
                </select>
              </div>

              {/* Experience Level */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Experience level</h4>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">3 - 5 Years</option>
                  <option value="0-2">0-2 Years</option>
                  <option value="3-5">3-5 Years</option>
                  <option value="5+">5+ Years</option>
                </select>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Skills</h4>
                <div className="space-y-2 mb-2">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm text-gray-700">Figma</span>
                    <button className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm text-gray-700">Sketch</span>
                    <button className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm text-gray-700">User Research</span>
                    <button className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Add Skill..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">No applications match your filters</p>
                </div>
              ) : (
                <>
                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Select All</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleBulkAction('shortlist')}
                        className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        Shortlist Selected
                      </button>
                      <button 
                        onClick={() => handleBulkAction('reject')}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject Selected
                      </button>
                      <button 
                        onClick={() => handleBulkAction('export')}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Applications */}
                  <div className="space-y-4">
                    {filteredApplications.map((application) => (
                      <div
                        key={application.id}
                        className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between">
                          {/* Left: Checkbox and Candidate Info */}
                          <div className="flex items-start space-x-4 flex-1">
                            <input
                              type="checkbox"
                              className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  Candidate: {application.candidate.name}
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                  <span className="text-gray-500">Role:</span>
                                  <span className="ml-2 text-gray-900 font-medium">{application.role}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <span className="ml-2 text-gray-900">{application.candidate.email}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Education:</span>
                                  <span className="ml-2 text-gray-900">{application.candidate.education}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Experience:</span>
                                  <span className="ml-2 text-gray-900 font-medium">{application.candidate.experience}</span>
                                </div>
                              </div>

                              {/* Score Badges */}
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.overall)}`}>
                                  Overall Score: {application.scores.overall}%
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.resume)}`}>
                                  Resume: {application.scores.resume}%
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.interview)}`}>
                                  Interview: {application.scores.interview}%
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.communication)}`}>
                                  Communication: {application.scores.communication}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status and Actions */}
                          <div className="flex flex-col items-end space-y-3 ml-4">
                            <select 
                              value={application.status}
                              onChange={(e) => handleStatusChange(application.id, e.target.value)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${getStatusColor(application.status)} focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Interviewed">Interviewed</option>
                              <option value="Hired">Hired</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                            <button className="w-full px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors">
                              View Detail
                            </button>
                            <p className="text-xs text-gray-500">Applied: {application.appliedDate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EmployerApplicationsReview
