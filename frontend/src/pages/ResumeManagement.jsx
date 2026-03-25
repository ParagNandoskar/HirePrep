import React, { useState, useEffect, useCallback } from 'react'
import { HiDownload, HiTrash, HiEye, HiPlus, HiSave, HiX, HiPencil, HiCheckCircle } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { resumeAPI } from '../services/api'

// Get API base URL for constructing full URLs
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
const BASE_URL = API_BASE_URL.replace('/api', '')

const ResumeManagement = () => {
  const { user } = useAuth()
  const { addNotification, setLoading } = useApp()
  const [resumes, setResumes] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(null) // Store the resume ID being confirmed for deletion
  const [showBuilderModal, setShowBuilderModal] = useState(false)
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: user?.name || '',
      email: user?.email || '',
      phone: '',
      location: '',
      linkedin: '',
      github: '',
      portfolio: ''
    },
    summary: '',
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: []
  })
  const [activeSection, setActiveSection] = useState('personal')
  const [tempSkill, setTempSkill] = useState('')
  const [tempCertification, setTempCertification] = useState({ name: '', issuer: '', date: '' })

  // Load resumes on component mount
  useEffect(() => {
    loadResumes()
  }, [])

  const loadResumes = async () => {
    try {
      setLoading(true)
      const response = await resumeAPI.getResumes()
      const resumesList = response?.data?.resumes || []
      setResumes(resumesList)
    } catch (error) {
      // "No resume found" is a normal state after deletion, not an error
      if (error.message?.includes('No resume found') || error.message?.includes('404')) {
        setResumes([])
      } else {
        console.error('❌ Error loading resumes:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (resume) => {
    setConfirmingDelete(resume._id) // Set the resume ID we're confirming to delete
  }

  const cancelDelete = () => {
    setConfirmingDelete(null) // Clear confirmation state
  }

  // Resume Builder Functions
  const addSkill = () => {
    if (tempSkill.trim() && !resumeData.skills.includes(tempSkill.trim())) {
      setResumeData(prev => ({
        ...prev,
        skills: [...prev.skills, tempSkill.trim()]
      }))
      setTempSkill('')
    }
  }

  const removeSkill = (skillToRemove) => {
    setResumeData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const addExperience = () => {
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, {
        id: Date.now(),
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        description: ''
      }]
    }))
  }

  const updateExperience = (id, field, value) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }))
  }

  const removeExperience = (id) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }))
  }

  const addEducation = () => {
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, {
        id: Date.now(),
        school: '',
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        gpa: ''
      }]
    }))
  }

  const updateEducation = (id, field, value) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.map(edu =>
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }))
  }

  const removeEducation = (id) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }))
  }

  const addProject = () => {
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, {
        id: Date.now(),
        name: '',
        description: '',
        technologies: '',
        link: ''
      }]
    }))
  }

  const updateProject = (id, field, value) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.map(proj =>
        proj.id === id ? { ...proj, [field]: value } : proj
      )
    }))
  }

  const removeProject = (id) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter(proj => proj.id !== id)
    }))
  }

  const addCertification = () => {
    if (tempCertification.name && tempCertification.issuer) {
      setResumeData(prev => ({
        ...prev,
        certifications: [...prev.certifications, {
          id: Date.now(),
          ...tempCertification
        }]
      }))
      setTempCertification({ name: '', issuer: '', date: '' })
    }
  }

  const removeCertification = (id) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }))
  }

  const saveResumeData = () => {
    // Save to localStorage for now
    localStorage.setItem(`resumeData_${user?._id}`, JSON.stringify(resumeData))
    addNotification({
      type: 'success',
      message: 'Resume data saved successfully!'
    })
    setShowBuilderModal(false)
  }

  // Load resume data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`resumeData_${user?._id}`)
    if (saved) {
      try {
        setResumeData(JSON.parse(saved))
      } catch (error) {
        console.error('Error loading resume data:', error)
      }
    }
  }, [user])

  const confirmDelete = async (resume) => {
    if (!resume || !resume._id) {
      addNotification({
        type: 'error',
        message: 'Invalid resume selected for deletion'
      })
      setConfirmingDelete(null)
      return
    }

    try {
      setLoading(true)
      
      const response = await resumeAPI.deleteResume(resume._id)
      
      if (response && (response.success || response.status === 200)) {
        addNotification({
          type: 'success',
          message: 'Resume deleted successfully!'
        })
        
        // Update local state - remove the deleted resume
        setResumes(prevResumes => prevResumes.filter(r => r._id !== resume._id))
        
      } else {
        throw new Error(response?.message || 'Delete operation failed')
      }
    } catch (error) {
      console.error('❌ Delete error:', error)
      addNotification({
        type: 'error',
        message: error.message || 'Failed to delete resume. Please try again.'
      })
    } finally {
      setLoading(false)
      setConfirmingDelete(null)
    }
  }

  const handleFileUpload = async (files) => {
    const file = files[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      addNotification({
        type: 'error',
        message: 'Please upload a PDF file only'
      })
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      addNotification({
        type: 'error',
        message: 'File size must be less than 10MB'
      })
      return
    }

    try {
      setUploading(true)
      const response = await resumeAPI.uploadResume(file)
      
      if (response.success) {
        addNotification({
          type: 'success',
          message: 'Resume uploaded successfully!'
        })
        
        // Reload resumes to show the newly uploaded file
        await loadResumes()
      }
    } catch (error) {
      console.error('Upload error:', error)
      addNotification({
        type: 'error',
        message: error.message || 'Failed to upload resume. Please try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    handleFileUpload(files)
  }

  const browsFiles = () => {
    document.getElementById('file-input').click()
  }

  const handleDownload = async (resume) => {
    try {
      if (resume.fileUrl && resume.fileUrl.startsWith('/api/')) {
        await handleDownloadWithAuth(resume.fileUrl, resume.filename || 'resume.pdf')
      } else if (resume.fileUrl) {
        window.open(resume.fileUrl, '_blank')
      } else {
        throw new Error('Download URL not available')
      }
    } catch (error) {
      console.error('Download error:', error)
      addNotification({
        type: 'error',
        message: 'Failed to download resume. Please try again.'
      })
    }
  }

  const handleDownloadWithAuth = async (apiPath, filename) => {
    try {
      const token = localStorage.getItem('authToken')
      
      if (!token) {
        addNotification({
          type: 'error',
          message: 'You need to be logged in to download resumes'
        })
        return
      }

      const response = await fetch(`${BASE_URL}${apiPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch resume')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Auth download error:', error)
      addNotification({
        type: 'error',
        message: 'Failed to download resume. Please try again.'
      })
    }
  }

  const handleView = (resume) => {
    try {
      if (resume.fileUrl) {
        if (resume.fileUrl.startsWith('/api/')) {
          handleViewWithAuth(resume.fileUrl)
        } else {
          window.open(resume.fileUrl, '_blank')
        }
      } else {
        addNotification({
          type: 'error',
          message: 'Resume file not available for viewing'
        })
      }
    } catch (error) {
      console.error('View error:', error)
      addNotification({
        type: 'error',
        message: 'Failed to open resume. Please try again.'
      })
    }
  }

  const handleViewWithAuth = async (apiPath) => {
    try {
      const token = localStorage.getItem('authToken')
      
      if (!token) {
        addNotification({
          type: 'error',
          message: 'You need to be logged in to view resumes'
        })
        return
      }

      const response = await fetch(`${BASE_URL}${apiPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch resume')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Auth view error:', error)
      addNotification({
        type: 'error',
        message: 'Failed to view resume. Please try again.'
      })
    }
  }
  
  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border-2 border-blue-400 p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-800">Your Resumes</h1>
            <button
              onClick={() => setShowBuilderModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
            >
              <HiPencil className="w-5 h-5" />
              <span>Resume Builder</span>
            </button>
          </div>
          
          {/* Upload Area */}
          <div 
            className={`border-2 border-dashed rounded-2xl p-12 mb-8 text-center transition-colors ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 bg-gray-50'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                {uploading ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                ) : (
                  <HiPlus className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {uploading ? 'Uploading resume...' : 'Upload resume'}
                </h3>
                <p className="text-gray-600">
                  {uploading ? 'Please wait...' : (
                    <>
                      Drag and drop or{' '}
                      <span
                        role="button"
                        onClick={browsFiles}
                        className="text-blue-500 hover:text-blue-600 underline transition-colors cursor-pointer"
                      >
                        browse files
                      </span>
                    </>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">PDF files only, max 10MB</p>
              </div>
            </div>
            <input
              id="file-input"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </div>
          
          {/* Resume Table */}
          <div className="overflow-hidden rounded-xl">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600 rounded-tl-xl">
                    File Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Upload Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-600 rounded-tr-xl">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {resumes.map((resume) => (
                  <tr key={resume._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center mr-3">
                          <span className="text-red-600 text-xs font-semibold">PDF</span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">
                            {resume.filename || resume.originalName || 'Resume'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {resume.size ? (typeof resume.size === 'number' ? 
                              `${(resume.size / (1024 * 1024)).toFixed(1)} MB` : 
                              resume.size) : 'Unknown size'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {resume.uploadDate ? new Date(resume.uploadDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'Unknown date'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {resume.lastAnalyzed ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-600">Skills Extracted</span>
                          </div>
                        ) : resume.uploadDate ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-yellow-600">Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                            <span className="text-sm text-gray-600">Uploaded</span>
                          </div>
                        )}
                        {resume.extractedData?.skills && resume.extractedData.skills.length > 0 ? (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">
                              {resume.extractedData.skills.length} skills found
                            </span>
                          </div>
                        ) : resume.lastAnalyzed ? (
                          <div className="mt-1">
                            <span className="text-xs text-gray-500">
                              No skills extracted
                            </span>
                          </div>
                        ) : resume.uploadDate ? (
                          <div className="mt-1">
                            <span className="text-xs text-blue-600">
                              Skills being extracted...
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-3">
                        {confirmingDelete === resume._id ? (
                          // Show confirmation buttons inline
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Delete this resume?</span>
                            <button
                              onClick={() => confirmDelete(resume)}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={cancelDelete}
                              className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          // Show normal action buttons
                          <>
                            <button
                              onClick={() => handleDownload(resume)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Download"
                            >
                              <HiDownload className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(resume)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <HiTrash className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleView(resume)}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <HiEye className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {resumes.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <HiPlus className="w-16 h-16 mx-auto opacity-50" />
              </div>
              <p className="text-gray-500">No resumes uploaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Resume Builder Modal */}
      {showBuilderModal && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Resume Builder</h2>
              <button
                onClick={() => setShowBuilderModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Section Tabs */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200">
                {[
                  { id: 'personal', label: 'Personal Info' },
                  { id: 'summary', label: 'Summary' },
                  { id: 'skills', label: 'Skills' },
                  { id: 'experience', label: 'Experience' },
                  { id: 'education', label: 'Education' },
                  { id: 'projects', label: 'Projects' },
                  { id: 'certifications', label: 'Certifications' }
                ].map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-700 text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              {/* Personal Info Section */}
              {activeSection === 'personal' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={resumeData.personalInfo.name}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, name: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, email: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, phone: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, location: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      placeholder="LinkedIn URL"
                      value={resumeData.personalInfo.linkedin}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, linkedin: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      placeholder="GitHub URL"
                      value={resumeData.personalInfo.github}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, github: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="url"
                      placeholder="Portfolio URL"
                      value={resumeData.personalInfo.portfolio}
                      onChange={(e) => setResumeData(prev => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, portfolio: e.target.value }
                      }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 md:col-span-2"
                    />
                  </div>
                </div>
              )}

              {/* Summary Section */}
              {activeSection === 'summary' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Summary</h3>
                  <textarea
                    placeholder="Write a brief summary about yourself, your experience, and career goals..."
                    value={resumeData.summary}
                    onChange={(e) => setResumeData(prev => ({ ...prev, summary: e.target.value }))}
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Skills Section */}
              {activeSection === 'skills' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Skills</h3>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Add a skill"
                      value={tempSkill}
                      onChange={(e) => setTempSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={addSkill}
                      className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                    >
                      <HiPlus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resumeData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg"
                      >
                        <span>{skill}</span>
                        <button
                          onClick={() => removeSkill(skill)}
                          className="hover:text-blue-900"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Section */}
              {activeSection === 'experience' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Work Experience</h3>
                    <button
                      onClick={addExperience}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                    >
                      <HiPlus className="w-5 h-5" />
                      <span>Add Experience</span>
                    </button>
                  </div>
                  {resumeData.experience.map((exp) => (
                    <div key={exp.id} className="border border-gray-300 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-900">Experience Entry</h4>
                        <button
                          onClick={() => removeExperience(exp.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="Company"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Position"
                          value={exp.position}
                          onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="month"
                          placeholder="Start Date"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="month"
                          placeholder="End Date"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                          disabled={exp.current}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                        />
                      </div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exp.current}
                          onChange={(e) => updateExperience(exp.id, 'current', e.target.checked)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">Currently working here</span>
                      </label>
                      <textarea
                        placeholder="Description of responsibilities and achievements..."
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Education Section */}
              {activeSection === 'education' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Education</h3>
                    <button
                      onClick={addEducation}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                    >
                      <HiPlus className="w-5 h-5" />
                      <span>Add Education</span>
                    </button>
                  </div>
                  {resumeData.education.map((edu) => (
                    <div key={edu.id} className="border border-gray-300 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-900">Education Entry</h4>
                        <button
                          onClick={() => removeEducation(edu.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="School/University"
                          value={edu.school}
                          onChange={(e) => updateEducation(edu.id, 'school', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg md:col-span-2"
                        />
                        <input
                          type="text"
                          placeholder="Degree"
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="Field of Study"
                          value={edu.field}
                          onChange={(e) => updateEducation(edu.id, 'field', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="month"
                          placeholder="Start Date"
                          value={edu.startDate}
                          onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="month"
                          placeholder="End Date"
                          value={edu.endDate}
                          onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg"
                        />
                        <input
                          type="text"
                          placeholder="GPA (optional)"
                          value={edu.gpa}
                          onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                          className="px-4 py-2 border border-gray-300 rounded-lg md:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Projects Section */}
              {activeSection === 'projects' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Projects</h3>
                    <button
                      onClick={addProject}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                    >
                      <HiPlus className="w-5 h-5" />
                      <span>Add Project</span>
                    </button>
                  </div>
                  {resumeData.projects.map((proj) => (
                    <div key={proj.id} className="border border-gray-300 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-gray-900">Project Entry</h4>
                        <button
                          onClick={() => removeProject(proj.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Project Name"
                        value={proj.name}
                        onChange={(e) => updateProject(proj.id, 'name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <textarea
                        placeholder="Project Description"
                        value={proj.description}
                        onChange={(e) => updateProject(proj.id, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Technologies Used (comma-separated)"
                        value={proj.technologies}
                        onChange={(e) => updateProject(proj.id, 'technologies', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <input
                        type="url"
                        placeholder="Project Link (GitHub, Demo, etc.)"
                        value={proj.link}
                        onChange={(e) => updateProject(proj.id, 'link', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications Section */}
              {activeSection === 'certifications' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <input
                      type="text"
                      placeholder="Certification Name"
                      value={tempCertification.name}
                      onChange={(e) => setTempCertification(prev => ({ ...prev, name: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Issuing Organization"
                      value={tempCertification.issuer}
                      onChange={(e) => setTempCertification(prev => ({ ...prev, issuer: e.target.value }))}
                      className="px-4 py-2 border border-gray-300 rounded-lg"
                    />
                    <div className="flex gap-2">
                      <input
                        type="month"
                        placeholder="Date Obtained"
                        value={tempCertification.date}
                        onChange={(e) => setTempCertification(prev => ({ ...prev, date: e.target.value }))}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={addCertification}
                        className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800"
                      >
                        <HiPlus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {resumeData.certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-center justify-between p-4 border border-gray-300 rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{cert.name}</h4>
                          <p className="text-sm text-gray-600">{cert.issuer}</p>
                          {cert.date && (
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(cert.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeCertification(cert.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiTrash className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowBuilderModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveResumeData}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800"
                >
                  <HiSave className="w-5 h-5" />
                  <span>Save Resume Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}


export default ResumeManagement