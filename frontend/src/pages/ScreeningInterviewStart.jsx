import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiVideoCamera, HiMicrophone, HiClock, HiLightBulb, HiCheckCircle } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { jobsAPI } from '../services/api'

const ScreeningInterviewStart = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { jobId, applicationId, jobTitle, companyName } = location.state || {}
  
  const [jobDetails, setJobDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [permissionsGranted, setPermissionsGranted] = useState(false)
  const [checkingPermissions, setCheckingPermissions] = useState(false)

  useEffect(() => {
    if (!jobId) {
      navigate('/student-dashboard/applications')
      return
    }
    fetchJobDetails()
  }, [jobId])

  const fetchJobDetails = async () => {
    try {
      const response = await jobsAPI.getJob(jobId)
      if (response && response.job) {
        setJobDetails(response.job)
      }
    } catch (error) {
      console.error('Error fetching job details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkPermissions = async () => {
    setCheckingPermissions(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      // Stop the stream immediately after checking
      stream.getTracks().forEach(track => track.stop())
      
      setPermissionsGranted(true)
      setTimeout(() => {
        startInterview()
      }, 500)
    } catch (error) {
      console.error('Permission denied:', error)
      
      let errorMessage = '🎥 Camera and Microphone Access Required\n\n'
      
      if (error.name === 'NotAllowedError') {
        errorMessage += '❌ You denied permission to access your camera and microphone.\n\n'
        errorMessage += '✅ To fix this:\n'
        errorMessage += '1. Click the camera icon in your browser address bar\n'
        errorMessage += '2. Select "Allow" for camera and microphone\n'
        errorMessage += '3. Refresh the page and try again'
      } else if (error.name === 'NotFoundError') {
        errorMessage += '❌ No camera or microphone detected.\n\n'
        errorMessage += '✅ Please connect a camera and microphone and try again.'
      } else {
        errorMessage += '❌ Unable to access camera/microphone.\n\n'
        errorMessage += 'Error: ' + error.message
      }
      
      alert(errorMessage)
      setPermissionsGranted(false)
    } finally {
      setCheckingPermissions(false)
    }
  }

  const startInterview = () => {
    navigate('/student-dashboard/screening-interview/live', {
      state: {
        jobId,
        applicationId,
        jobTitle,
        companyName,
        jobDescription: jobDetails?.description,
        customQuestions: jobDetails?.interviewQuestions || [],
        totalQuestions: (jobDetails?.interviewQuestions?.length || 0) + 5 // Custom + 5 AI generated
      }
    })
  }

  if (isLoading) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  const customQuestionsCount = jobDetails?.interviewQuestions?.length || 0
  const aiQuestionsCount = 5
  const totalQuestions = customQuestionsCount + aiQuestionsCount
  const estimatedTime = totalQuestions * 2 // 2 minutes per question

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-400 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full mb-4">
              <HiVideoCamera className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Screening Interview</h1>
            <p className="text-lg text-gray-600">{jobTitle}</p>
            <p className="text-md text-gray-500">{companyName}</p>
          </div>

          {/* Interview Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <HiCheckCircle className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{totalQuestions}</p>
              <p className="text-sm text-blue-700">Total Questions</p>
              <p className="text-xs text-blue-600 mt-1">
                {customQuestionsCount} Custom + {aiQuestionsCount} AI Generated
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <HiClock className="w-8 h-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{estimatedTime} min</p>
              <p className="text-sm text-purple-700">Estimated Time</p>
              <p className="text-xs text-purple-600 mt-1">~2 min per question</p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <HiVideoCamera className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">AI</p>
              <p className="text-sm text-green-700">Conducted By</p>
              <p className="text-xs text-green-600 mt-1">Automated Evaluation</p>
            </div>
          </div>

          {/* Important Instructions */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
            <div className="flex items-start">
              <HiLightBulb className="w-6 h-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">Important Instructions</h3>
                <ul className="space-y-2 text-sm text-yellow-800">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>This is an <strong>AI-conducted screening interview</strong> for your job application</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Your performance will be evaluated and ranked on a <strong>job-specific leaderboard</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Top performers get <strong>priority consideration</strong> from the employer</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Ensure you're in a <strong>quiet environment</strong> with good lighting</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>Camera and microphone</strong> access are required</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You'll have <strong>2 minutes per question</strong> to respond</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Questions are based on the <strong>job description and employer's custom questions</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Speak clearly and provide detailed, relevant answers</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* What to Expect Section */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">What to Expect</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Permission Check</p>
                  <p className="text-sm text-gray-600">Grant camera and microphone access</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">Custom Questions</p>
                  <p className="text-sm text-gray-600">Answer {customQuestionsCount} question(s) prepared by the employer</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">AI-Generated Questions</p>
                  <p className="text-sm text-gray-600">Answer {aiQuestionsCount} dynamic questions based on the job requirements</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                  4
                </div>
                <div>
                  <p className="font-medium text-gray-900">Automated Evaluation</p>
                  <p className="text-sm text-gray-600">AI analyzes your responses and generates a performance score</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                  5
                </div>
                <div>
                  <p className="font-medium text-gray-900">Leaderboard Ranking</p>
                  <p className="text-sm text-gray-600">Your score appears on the job-specific leaderboard for employer review</p>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Status */}
          {permissionsGranted && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center">
              <HiCheckCircle className="w-6 h-6 text-green-600 mr-3" />
              <p className="text-green-800 font-medium">Permissions granted! Starting interview...</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={() => navigate('/student-dashboard/applications')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={checkPermissions}
              disabled={checkingPermissions}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingPermissions ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Checking Permissions...</span>
                </>
              ) : (
                <>
                  <HiMicrophone className="w-5 h-5" />
                  <span>Start Screening Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ScreeningInterviewStart
