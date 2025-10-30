import React, { useState, useEffect } from 'react'
import { HiDownload, HiTrash, HiEye, HiPlus } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import Button from '../components/ui/Button'
import ConfirmationDialog from '../components/ui/ConfirmationDialog'
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
  const [hasProcessingResumes, setHasProcessingResumes] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, resume: null })

  // Add error boundary protection
  useEffect(() => {
    const handleError = (error) => {
      console.error('⚠️ Unhandled error in ResumeManagement:', error)
      addNotification({
        type: 'error',
        message: 'An unexpected error occurred. Please refresh the page.'
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleError)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleError)
    }
  }, [])

  // Load resumes on component mount
  useEffect(() => {
    loadResumes()
  }, [])

  // Auto-refresh resumes if there are any processing
  useEffect(() => {
    let interval;
    if (hasProcessingResumes) {
      console.log('Setting up auto-refresh for processing resumes...');
      interval = setInterval(() => {
        console.log('Auto-refreshing resumes...');
        loadResumes();
      }, 3000); // Check every 3 seconds
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [hasProcessingResumes])

  const loadResumes = async () => {
    try {
      setLoading(true)
      const response = await resumeAPI.getResumes()
      
      console.log('🔍 Resume API response:', response);
      
      // Backend uses successResponse helper, so data is in response.data.resumes
      const resumesList = response?.data?.resumes || []
      console.log('🔍 Found resumes:', resumesList.length);
      
      if (resumesList.length > 0) {
        resumesList.forEach((resume, index) => {
          console.log(`🔍 Resume ${index}:`, {
            filename: resume.filename,
            uploadDate: resume.uploadDate,
            lastAnalyzed: resume.lastAnalyzed,
            extractedData: resume.extractedData,
            isProcessed: resume.isProcessed
          });
        });
      }
      
      setResumes(resumesList)
      
      // Check if any resumes are still processing
      const processing = resumesList.some(resume => !resume.lastAnalyzed && resume.uploadDate)
      setHasProcessingResumes(processing)
      
      console.log('📊 Resumes loaded:', resumesList.length, 'Processing:', processing)
    } catch (error) {
      console.error('❌ Error loading resumes:', error)
      // Note: Removed notification to avoid localhost popup
    } finally {
      setLoading(false)
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
          message: 'Resume uploaded successfully! Skills are being extracted in the background...'
        })
        
        // Reload resumes to show the newly uploaded file
        await loadResumes()
        
        // Show notification about skill processing
        setTimeout(() => {
          addNotification({
            type: 'info',
            message: 'Skills are being extracted from your resume. Check your profile in a few moments!'
          })
        }, 3000)
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

  const handleDownload = async (resume) => {
    try {
      if (resume.fileUrl && resume.fileUrl.startsWith('/api/')) {
        // Local backend file - handle with authentication
        await handleDownloadWithAuth(resume.fileUrl, resume.filename || 'resume.pdf')
      } else if (resume.fileUrl) {
        // S3 URL or external URL - can open directly
        window.open(resume.fileUrl, '_blank')
      } else {
        // Fallback - try to get download URL using API
        const response = await resumeAPI.downloadResume(resume._id)
        if (response.downloadUrl) {
          window.open(response.downloadUrl, '_blank')
        } else {
          throw new Error('Download URL not available')
        }
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
      // Get the token
      const token = localStorage.getItem('authToken')
      
      if (!token) {
        addNotification({
          type: 'error',
          message: 'You need to be logged in to download resumes'
        })
        return
      }

      // Fetch the file with authentication
      const response = await fetch(`${BASE_URL}${apiPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch resume')
      }

      // Create blob and download it
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the blob URL
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Auth download error:', error)
      addNotification({
        type: 'error',
        message: 'Failed to download resume. Please try again.'
      })
    }
  }

  const handleDelete = async (resume) => {
    try {
      console.log('🗑️ Starting delete process for:', resume.filename || resume.originalName)
      setDeleteDialog({ isOpen: true, resume })
    } catch (error) {
      console.error('❌ Error in handleDelete:', error)
      addNotification({
        type: 'error',
        message: 'Failed to initiate delete process'
      })
    }
  }

  const cancelDelete = () => {
    try {
      console.log('❌ Delete cancelled')
      setDeleteDialog({ isOpen: false, resume: null })
    } catch (error) {
      console.error('❌ Error in cancelDelete:', error)
      setDeleteDialog({ isOpen: false, resume: null })
    }
  }

  const confirmDelete = async () => {
    const resume = deleteDialog.resume
    if (!resume) {
      console.error('No resume selected for deletion')
      setDeleteDialog({ isOpen: false, resume: null })
      return
    }

    try {
      console.log('🗑️ Deleting resume:', resume._id)
      setLoading(true)
      
      const response = await resumeAPI.deleteResume(resume._id)
      console.log('🗑️ Delete response:', response)
      
      if (response && response.success) {
        addNotification({
          type: 'success',
          message: 'Resume deleted successfully from both database and storage'
        })
        
        // Remove from local state
        const updatedResumes = resumes.filter(r => r._id !== resume._id)
        console.log('🗑️ Updated resumes count:', updatedResumes.length)
        setResumes(updatedResumes)
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
      setDeleteDialog({ isOpen: false, resume: null })
      console.log('🗑️ Delete operation completed')
    }
  }

  const handleView = (resume) => {
    try {
      if (resume.fileUrl) {
        // If it's a relative API path, we need to handle authentication
        if (resume.fileUrl.startsWith('/api/')) {
          // For authenticated endpoints, we'll fetch the file with token and create a blob URL
          handleViewWithAuth(resume.fileUrl)
        } else {
          // Already a full URL (S3 or external) - can open directly
          window.open(resume.fileUrl, '_blank')
        }
      } else if (resume._id) {
        // Use the API service to get the correct URL and handle with auth
        const viewUrl = resumeAPI.viewResume(resume._id)
        handleViewWithAuth(viewUrl.replace(BASE_URL, ''))
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
      // Get the token
      const token = localStorage.getItem('authToken')
      
      if (!token) {
        addNotification({
          type: 'error',
          message: 'You need to be logged in to view resumes'
        })
        return
      }

      // Fetch the file with authentication
      const response = await fetch(`${BASE_URL}${apiPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch resume')
      }

      // Create blob URL and open it
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      console.error('Auth view error:', error)
      addNotification({
        type: 'error',
        message: 'Failed to view resume. Please try again.'
      })
    }
  }

  const browsFiles = () => {
    document.getElementById('file-input').click()
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border-2 border-blue-400 p-8">
          <h1 className="text-2xl font-semibold text-gray-800 mb-8">Your Resumes</h1>
          
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
                      {/* FIX: Changed from button to span with role="button" */}
                      <span
                        role="button"
                        onClick={browsFiles}
                        className="text-blue-500 hover:text-blue-600 underline transition-colors disabled:opacity-50 cursor-pointer"
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

          {/* Resume Table (omitted for brevity) */}
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
                            {resume.nlpScore && (
                              <span className="text-xs text-gray-500 ml-2">
                                • Score: {Math.round(resume.nlpScore)}%
                              </span>
                            )}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Resume"
        message={`Are you sure you want to delete "${deleteDialog.resume?.filename || deleteDialog.resume?.originalName || 'this resume'}"? This action cannot be undone and will remove the file from both the database and cloud storage.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </DashboardLayout>
  )
}

export default ResumeManagement