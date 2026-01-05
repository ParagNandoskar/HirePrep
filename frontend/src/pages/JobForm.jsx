import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { HiPlus, HiX, HiSave, HiArrowLeft } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { jobsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const JobForm = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { jobId } = useParams()
  const isEditMode = Boolean(jobId)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    jobType: 'full-time',
    experienceLevel: 'mid',
    requirements: {
      skills: [],
      education: {
        degree: "Bachelor's",
        field: '',
        required: false
      },
      experience: {
        minYears: 0,
        maxYears: 10,
        industries: []
      },
      location: {
        type: 'Remote',
        remote: true,
        hybrid: false
      }
    },
    compensation: {
      salaryMin: '',
      salaryMax: '',
      currency: 'USD',
      benefits: []
    },
    applicationDeadline: '',
    tags: [],
    status: 'draft',
    interviewQuestions: []
  })

  const [skillInput, setSkillInput] = useState('')
  const [industryInput, setIndustryInput] = useState('')
  const [benefitInput, setBenefitInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [questionInput, setQuestionInput] = useState({ question: '', expectedAnswer: '', timeLimit: 2 })

  useEffect(() => {
    if (isEditMode) {
      fetchJobDetails()
    }
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      setIsLoading(true)
      const response = await jobsAPI.getJob(jobId)
      if (response && response.job) {
        setFormData({
          ...response.job,
          applicationDeadline: response.job.applicationDeadline 
            ? new Date(response.job.applicationDeadline).toISOString().split('T')[0]
            : ''
        })
      }
    } catch (error) {
      console.error('Error fetching job:', error)
      alert('Failed to load job details')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleNestedChange = (section, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const handleDeepNestedChange = (section, subsection, field, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }))
  }

  const addArrayItem = (section, field, value, setInputFunc) => {
    if (!value.trim()) return
    
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: [...(prev[section]?.[field] || []), value.trim()]
      }
    }))
    setInputFunc('')
  }

  const removeArrayItem = (section, field, index) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: prev[section][field].filter((_, i) => i !== index)
      }
    }))
  }

  const addSkill = () => {
    if (!skillInput.trim()) return
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        skills: [
          ...prev.requirements.skills,
          {
            name: skillInput.trim(),
            required: true,
            experience: 'mid'
          }
        ]
      }
    }))
    setSkillInput('')
  }

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        skills: prev.requirements.skills.filter((_, i) => i !== index)
      }
    }))
  }

  const addTag = () => {
    if (!tagInput.trim()) return
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, tagInput.trim()]
    }))
    setTagInput('')
  }

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const addInterviewQuestion = () => {
    if (!questionInput.question.trim()) {
      alert('Please enter a question')
      return
    }
    setFormData(prev => ({
      ...prev,
      interviewQuestions: [
        ...prev.interviewQuestions,
        {
          id: Date.now(),
          question: questionInput.question.trim(),
          expectedAnswer: questionInput.expectedAnswer.trim(),
          timeLimit: parseInt(questionInput.timeLimit) || 2,
          type: 'custom'
        }
      ]
    }))
    setQuestionInput({ question: '', expectedAnswer: '', timeLimit: 2 })
  }

  const removeInterviewQuestion = (id) => {
    setFormData(prev => ({
      ...prev,
      interviewQuestions: prev.interviewQuestions.filter(q => q.id !== id)
    }))
  }

  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title.trim()) {
      alert('Please enter a job title')
      return
    }
    if (!formData.description.trim()) {
      alert('Please enter a job description')
      return
    }

    try {
      setIsSaving(true)
      
      const submitData = {
        ...formData,
        status: isDraft ? 'draft' : 'active',
        compensation: {
          ...formData.compensation,
          salaryMin: parseInt(formData.compensation.salaryMin) || undefined,
          salaryMax: parseInt(formData.compensation.salaryMax) || undefined
        }
      }

      if (isEditMode) {
        await jobsAPI.updateJob(jobId, submitData)
        alert('Job updated successfully!')
      } else {
        await jobsAPI.createJob(submitData)
        alert('Job created successfully!')
      }
      
      navigate('/employer-dashboard/jobs')
    } catch (error) {
      console.error('Error saving job:', error)
      alert('Failed to save job. Please try again.')
    } finally {
      setIsSaving(false)
    }
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

  return (
    <DashboardLayout sidebarContent={<EmployerSidebar />} userType="employer">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate('/employer-dashboard/jobs')}
              className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
            >
              <HiArrowLeft className="w-5 h-5 mr-2" />
              Back to Jobs
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Job Posting' : 'Create New Job Posting'}
            </h2>
          </div>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Senior Full Stack Developer"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the role, responsibilities, and what you're looking for..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Type
                  </label>
                  <select
                    name="jobType"
                    value={formData.jobType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experience Level
                </label>
                <select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead/Principal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
            
            <div className="space-y-4">
              {/* Skills */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Skills
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Enter a skill and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.requirements.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm"
                    >
                      <span>{skill.name || skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="hover:text-blue-900"
                      >
                        <HiX className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Degree Required
                  </label>
                  <select
                    value={formData.requirements.education.degree}
                    onChange={(e) => handleDeepNestedChange('requirements', 'education', 'degree', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="High School">High School</option>
                    <option value="Associate's">Associate's</option>
                    <option value="Bachelor's">Bachelor's</option>
                    <option value="Master's">Master's</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={formData.requirements.education.field}
                    onChange={(e) => handleDeepNestedChange('requirements', 'education', 'field', e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Experience Years */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Years of Experience
                  </label>
                  <input
                    type="number"
                    value={formData.requirements.experience.minYears}
                    onChange={(e) => handleDeepNestedChange('requirements', 'experience', 'minYears', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Years of Experience
                  </label>
                  <input
                    type="number"
                    value={formData.requirements.experience.maxYears}
                    onChange={(e) => handleDeepNestedChange('requirements', 'experience', 'maxYears', parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Work Location Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Location Type
                </label>
                <select
                  value={formData.requirements.location.type}
                  onChange={(e) => {
                    const type = e.target.value
                    handleDeepNestedChange('requirements', 'location', 'type', type)
                    handleDeepNestedChange('requirements', 'location', 'remote', type === 'Remote')
                    handleDeepNestedChange('requirements', 'location', 'hybrid', type === 'Hybrid')
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="On-site">On-site</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compensation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Compensation & Benefits</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Salary
                  </label>
                  <input
                    type="number"
                    value={formData.compensation.salaryMin}
                    onChange={(e) => handleNestedChange('compensation', 'salaryMin', e.target.value)}
                    placeholder="50000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Salary
                  </label>
                  <input
                    type="number"
                    value={formData.compensation.salaryMax}
                    onChange={(e) => handleNestedChange('compensation', 'salaryMax', e.target.value)}
                    placeholder="100000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.compensation.currency}
                    onChange={(e) => handleNestedChange('compensation', 'currency', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benefits
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addArrayItem('compensation', 'benefits', benefitInput, setBenefitInput))}
                    placeholder="Enter a benefit and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => addArrayItem('compensation', 'benefits', benefitInput, setBenefitInput)}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.compensation.benefits?.map((benefit, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm"
                    >
                      <span>{benefit}</span>
                      <button
                        type="button"
                        onClick={() => removeArrayItem('compensation', 'benefits', index)}
                        className="hover:text-green-900"
                      >
                        <HiX className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interview Questions Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Screening Interview Questions</h3>
            <p className="text-sm text-gray-600 mb-4">
              Add custom questions for the AI-conducted screening interview. These will be asked to candidates who apply for this job. 
              AI will also generate additional dynamic questions based on your job description.
            </p>
            
            <div className="space-y-4">
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Question
                </label>
                <textarea
                  placeholder="e.g., Describe your experience with React hooks and state management"
                  value={questionInput.question}
                  onChange={(e) => setQuestionInput(prev => ({ ...prev, question: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                />
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Answer / Key Points (Optional - helps AI evaluate)
                </label>
                <textarea
                  placeholder="e.g., useState, useEffect, custom hooks, Redux, Context API"
                  value={questionInput.expectedAnswer}
                  onChange={(e) => setQuestionInput(prev => ({ ...prev, expectedAnswer: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700">
                      Time Limit (minutes):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={questionInput.timeLimit}
                      onChange={(e) => setQuestionInput(prev => ({ ...prev, timeLimit: e.target.value }))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addInterviewQuestion}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <HiPlus className="w-5 h-5" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>

              {/* Display Added Questions */}
              {formData.interviewQuestions && formData.interviewQuestions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Added Questions ({formData.interviewQuestions.length})</h4>
                  {formData.interviewQuestions.map((q, index) => (
                    <div key={q.id} className="border border-gray-300 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-semibold text-blue-600">Question {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeInterviewQuestion(q.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiX className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-gray-900 font-medium mb-2">{q.question}</p>
                      {q.expectedAnswer && (
                        <p className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Key Points:</span> {q.expectedAnswer}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">Time Limit: {q.timeLimit} minute(s)</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Tip:</strong> AI will use your job description and these questions to conduct comprehensive screening interviews. 
                  Top performers will automatically appear in the job-specific leaderboard.
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Application Deadline
                </label>
                <input
                  type="date"
                  name="applicationDeadline"
                  value={formData.applicationDeadline}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (for search and categorization)
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Enter a tag and press Enter"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    <HiPlus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="hover:text-purple-900"
                      >
                        <HiX className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pb-8">
            <button
              type="button"
              onClick={() => navigate('/employer-dashboard/jobs')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isSaving}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-lg disabled:opacity-50"
            >
              <HiSave className="w-5 h-5" />
              <span>{isSaving ? 'Publishing...' : isEditMode ? 'Update Job' : 'Publish Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

export default JobForm
