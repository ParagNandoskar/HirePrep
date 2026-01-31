import React, { useState, useEffect } from 'react'
import { HiPlus, HiPencil, HiTrash, HiEye, HiUsers, HiClock, HiStar, HiBriefcase } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import Button from '../components/ui/Button'
import { jobsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const JobManagement = () => {
  const { user } = useAuth()
  const { addNotification, setLoading } = useApp()
  
  const [jobs, setJobs] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    requirements: '',
    location: {
      type: 'on-site',
      city: '',
      state: '',
      country: 'United States'
    },
    jobDetails: {
      type: 'full-time',
      level: 'mid'
    },
    compensation: {
      salaryRange: {
        min: '',
        max: '',
        currency: 'USD'
      },
      benefits: ''
    },
    skills: '',
    applicationProcess: {
      applicationDeadline: ''
    },
    status: 'active'
  })

  // Debug log to check form state
  console.log('Current jobForm state:', jobForm)

  // Load jobs on component mount
  useEffect(() => {
    console.log('🔧 JobManagement: Component mounted, checking auth...')
    console.log('🔧 Auth user:', user)
    console.log('🔧 Token in localStorage:', localStorage.getItem('authToken'))
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      console.log('🚀 Starting to load jobs...')
      setIsLoading(true)
      console.log('🔑 Token being used:', localStorage.getItem('authToken'))
      console.log('👤 Current user:', user)
      
      const response = await jobsAPI.getMyJobs()
      console.log('📡 Full API response:', response)
      console.log('📊 Jobs data:', response.data?.jobs)
      console.log('📈 Jobs count:', response.data?.jobs?.length)
      
      setJobs(response.data?.jobs || [])
    } catch (error) {
      console.error('❌ Error loading jobs:', error)
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      })
      addNotification({
        type: 'error',
        message: 'Failed to load jobs'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    console.log('Input change:', name, value) // Debug log
    
    if (name.startsWith('location.')) {
      const locationField = name.split('.')[1]
      setJobForm(prev => ({
        ...prev,
        location: {
          ...prev.location,
          [locationField]: value
        }
      }))
    } else if (name.startsWith('jobDetails.')) {
      const jobDetailsField = name.split('.')[1]
      setJobForm(prev => ({
        ...prev,
        jobDetails: {
          ...prev.jobDetails,
          [jobDetailsField]: value
        }
      }))
    } else if (name.startsWith('compensation.salaryRange.')) {
      const salaryField = name.split('.')[2]
      setJobForm(prev => ({
        ...prev,
        compensation: {
          ...prev.compensation,
          salaryRange: {
            ...prev.compensation.salaryRange,
            [salaryField]: value
          }
        }
      }))
    } else if (name.startsWith('compensation.')) {
      const compensationField = name.split('.')[1]
      setJobForm(prev => ({
        ...prev,
        compensation: {
          ...prev.compensation,
          [compensationField]: value
        }
      }))
    } else if (name.startsWith('applicationProcess.')) {
      const applicationField = name.split('.')[1]
      setJobForm(prev => ({
        ...prev,
        applicationProcess: {
          ...prev.applicationProcess,
          [applicationField]: value
        }
      }))
    } else {
      setJobForm(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!jobForm.title.trim()) {
      addNotification({
        type: 'error',
        message: 'Job title is required!'
      })
      return
    }
    
    if (!jobForm.description.trim()) {
      addNotification({
        type: 'error',
        message: 'Job description is required!'
      })
      return
    }
    
    if (!jobForm.skills.trim()) {
      addNotification({
        type: 'error',
        message: 'Required skills are needed!'
      })
      return
    }
    
    try {
      setLoading(true)
      
      // Prepare job data according to Job model schema
      const jobData = {
        title: jobForm.title.trim(),
        description: jobForm.description.trim(),
        status: jobForm.status || 'active',
        
        // Requirements structure
        requirements: {
          skills: jobForm.skills.split(',').map(skill => ({
            name: skill.trim(),
            level: 'Intermediate',
            isRequired: true,
            weight: 5
          })).filter(skill => skill.name),
          
          education: {
            minimumLevel: 'Bachelor',
            isRequired: true
          },
          
          experience: {
            minimumYears: 0
          }
        },
        
        // Add other requirements if provided
        ...(jobForm.requirements && jobForm.requirements.trim() && {
          additionalRequirements: jobForm.requirements.split('\n').filter(req => req.trim())
        }),
        
        // Job details structure
        jobDetails: {
          type: jobForm.jobDetails.type,
          level: jobForm.jobDetails.level
        },
        
        // Location structure
        location: {
          type: jobForm.location.type,
          city: jobForm.location.city || '',
          state: jobForm.location.state || '',
          country: jobForm.location.country || 'United States'
        },
        
        // Compensation structure
        compensation: {
          salaryRange: {
            min: parseInt(jobForm.compensation.salaryRange.min) || 0,
            max: parseInt(jobForm.compensation.salaryRange.max) || 0,
            currency: jobForm.compensation.salaryRange.currency || 'USD'
          },
          benefits: jobForm.compensation.benefits ? 
            jobForm.compensation.benefits.split('\n').filter(benefit => benefit.trim()) : []
        },
        
        // Application process
        applicationProcess: {
          ...(jobForm.applicationProcess.applicationDeadline && {
            applicationDeadline: jobForm.applicationProcess.applicationDeadline
          })
        }
      }

      console.log('Submitting job data:', jobData) // Debug log

      let response
      if (editingJob) {
        response = await jobsAPI.updateJob(editingJob._id, jobData)
        addNotification({
          type: 'success',
          message: 'Job updated successfully!'
        })
      } else {
        response = await jobsAPI.createJob(jobData)
        addNotification({
          type: 'success',
          message: 'Job posted successfully!'
        })
      }

      console.log('Job submission response:', response) // Debug log

      // Reset form and close modal
      setJobForm({
        title: '',
        description: '',
        requirements: '',
        location: {
          type: 'on-site',
          city: '',
          state: '',
          country: 'United States'
        },
        jobDetails: {
          type: 'full-time',
          level: 'mid'
        },
        compensation: {
          salaryRange: {
            min: '',
            max: '',
            currency: 'USD'
          },
          benefits: ''
        },
        skills: '',
        applicationProcess: {
          applicationDeadline: ''
        },
        status: 'active'
      })
      setShowCreateModal(false)
      setEditingJob(null)
      
      // Reload jobs
      loadJobs()

    } catch (error) {
      console.error('Error saving job:', error)
      addNotification({
        type: 'error',
        message: error.message || 'Failed to save job'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (job) => {
    setEditingJob(job)
    setJobForm({
      title: job.title || '',
      description: job.description || '',
      requirements: job.additionalRequirements ? job.additionalRequirements.join('\n') : '',
      location: {
        type: job.location?.type || 'on-site',
        city: job.location?.city || '',
        state: job.location?.state || '',
        country: job.location?.country || 'United States'
      },
      jobDetails: {
        type: job.jobDetails?.type || 'full-time',
        level: job.jobDetails?.level || 'mid'
      },
      compensation: {
        salaryRange: {
          min: job.compensation?.salaryRange?.min?.toString() || '',
          max: job.compensation?.salaryRange?.max?.toString() || '',
          currency: job.compensation?.salaryRange?.currency || 'USD'
        },
        benefits: Array.isArray(job.compensation?.benefits) ? 
          job.compensation.benefits.join('\n') : ''
      },
      skills: job.requirements?.skills ? 
        job.requirements.skills.map(s => typeof s === 'string' ? s : s.name).join(', ') : '',
      applicationProcess: {
        applicationDeadline: job.applicationProcess?.applicationDeadline ? 
          job.applicationProcess.applicationDeadline.split('T')[0] : ''
      },
      status: job.status || 'active'
    })
    setShowCreateModal(true)
  }

  const handleDelete = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job?')) return
    
    try {
      setLoading(true)
      await jobsAPI.deleteJob(jobId)
      addNotification({
        type: 'success',
        message: 'Job deleted successfully!'
      })
      loadJobs()
    } catch (error) {
      console.error('Error deleting job:', error)
      addNotification({
        type: 'error',
        message: 'Failed to delete job'
      })
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingJob(null)
    setJobForm({
      title: '',
      description: '',
      requirements: '',
      location: {
        type: 'on-site',
        city: '',
        state: '',
        country: 'United States'
      },
      jobDetails: {
        type: 'full-time',
        level: 'mid'
      },
      compensation: {
        salaryRange: {
          min: '',
          max: '',
          currency: 'USD'
        },
        benefits: ''
      },
      skills: '',
      applicationProcess: {
        applicationDeadline: ''
      },
      status: 'active'
    })
    setShowCreateModal(true)
  }

  return (
    <DashboardLayout 
      sidebarContent={<EmployerSidebar />} 
      userType="employer"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Management</h1>
            <p className="text-gray-600">Manage your job postings and applications</p>
          </div>
          <Button
            onClick={openCreateModal}
            variant="primary"
            className="flex items-center space-x-2"
          >
            <HiPlus className="w-5 h-5" />
            <span>Post New Job</span>
          </Button>
        </div>

        {/* Jobs List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center">
              <HiBriefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h3>
              <p className="text-gray-500 mb-4">Start by posting your first job to attract candidates</p>
              <Button onClick={openCreateModal} variant="primary">
                Post Your First Job
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <div key={job._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                            job.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status || 'Active'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center">
                          <HiUsers className="w-4 h-4 mr-1" />
                          {job.applications?.length || 0} applications
                        </span>
                        <span className="flex items-center">
                          <HiClock className="w-4 h-4 mr-1" />
                          Posted {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          {job.location?.city && job.location?.state 
                            ? `${job.location.city}, ${job.location.state}` 
                            : job.location?.type || 'Location not specified'}
                        </span>
                        {job.compensation?.salaryRange?.min && job.compensation?.salaryRange?.max && (
                          <span>
                            ${job.compensation.salaryRange.min.toLocaleString()} - ${job.compensation.salaryRange.max.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {job.description}
                      </p>
                      
                      {job.requirements?.skills && job.requirements.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.skills.slice(0, 5).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              {typeof skill === 'string' ? skill : skill.name}
                            </span>
                          ))}
                          {job.requirements.skills.length > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{job.requirements.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={() => handleEdit(job)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Job"
                      >
                        <HiPencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(job._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

        {/* Create/Edit Job Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full relative z-10">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {editingJob ? 'Edit Job' : 'Post New Job'}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                      >
                        <span className="sr-only">Close</span>
                        ×
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Job Title */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Job Title *
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={jobForm?.title || ''}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="e.g. Senior Full Stack Developer"
                        />
                      </div>

                      {/* Location and Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          name="location.city"
                          value={jobForm?.location?.city || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="e.g. San Francisco"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State
                        </label>
                        <input
                          type="text"
                          name="location.state"
                          value={jobForm?.location?.state || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="e.g. CA"
                        />
                      </div>

                      {/* Work Type and Job Level */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Work Type *
                        </label>
                        <select
                          name="location.type"
                          value={jobForm?.location?.type || 'on-site'}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="on-site">On-site</option>
                          <option value="remote">Remote</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Job Type *
                        </label>
                        <select
                          name="jobDetails.type"
                          value={jobForm?.jobDetails?.type || 'full-time'}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="full-time">Full-time</option>
                          <option value="part-time">Part-time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                          <option value="freelance">Freelance</option>
                        </select>
                      </div>

                      {/* Job Level */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Experience Level *
                        </label>
                        <select
                          name="jobDetails.level"
                          value={jobForm?.jobDetails?.level || 'mid'}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="entry">Entry Level</option>
                          <option value="mid">Mid Level</option>
                          <option value="senior">Senior Level</option>
                          <option value="executive">Executive</option>
                        </select>
                      </div>

                      {/* Salary Range */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Salary
                        </label>
                        <input
                          type="number"
                          name="compensation.salaryRange.min"
                          value={jobForm?.compensation?.salaryRange?.min || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="50000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Salary
                        </label>
                        <input
                          type="number"
                          name="compensation.salaryRange.max"
                          value={jobForm?.compensation?.salaryRange?.max || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="80000"
                        />
                      </div>

                      {/* Application Deadline */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Application Deadline
                        </label>
                        <input
                          type="date"
                          name="applicationProcess.applicationDeadline"
                          value={jobForm?.applicationProcess?.applicationDeadline || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      {/* Skills */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Required Skills (comma-separated) *
                        </label>
                        <input
                          type="text"
                          name="skills"
                          value={jobForm?.skills || ''}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="JavaScript, React, Node.js, Python"
                        />
                      </div>

                      {/* Job Description */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Job Description *
                        </label>
                        <textarea
                          name="description"
                          value={jobForm?.description || ''}
                          onChange={handleInputChange}
                          required
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Describe the role, responsibilities, and what you're looking for..."
                        />
                      </div>

                      {/* Requirements */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Requirements (one per line)
                        </label>
                        <textarea
                          name="requirements"
                          value={jobForm?.requirements || ''}
                          onChange={handleInputChange}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Bachelor's degree in Computer Science&#10;3+ years of experience&#10;Strong communication skills"
                        />
                      </div>

                      {/* Benefits */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Benefits (one per line)
                        </label>
                        <textarea
                          name="compensation.benefits"
                          value={jobForm?.compensation?.benefits || ''}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Health insurance&#10;401k matching&#10;Flexible work hours"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : (editingJob ? 'Update Job' : 'Post Job')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default JobManagement