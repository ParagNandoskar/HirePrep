import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiVideoCamera, HiMicrophone, HiStop, HiClock } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import * as screeningInterviewService from '../services/screeningInterviewService'
import * as videoUploadService from '../services/videoUploadService'

const LiveScreeningInterview = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    jobId, 
    applicationId, 
    jobTitle, 
    companyName, 
    jobDescription,
    customQuestions = [],
    totalQuestions 
  } = location.state || {}

  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes per question
  const [responses, setResponses] = useState([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    if (!jobId || !applicationId) {
      navigate('/student-dashboard/applications')
      return
    }
    
    initializeInterview()
  }, [])

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0 && isRecording) {
      stopRecording()
    }
  }, [isRecording, timeLeft])

  const initializeInterview = async () => {
    try {
      // Initialize camera
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // Generate AI questions based on job description
      const aiQuestions = await generateAIQuestions(jobDescription)
      
      // Combine custom questions and AI questions
      const allQuestions = [
        ...customQuestions.map(q => ({
          ...q,
          type: 'custom',
          timeLimit: q.timeLimit || 2
        })),
        ...aiQuestions
      ]

      setQuestions(allQuestions)
      setIsGeneratingQuestions(false)
      setTimeLeft(allQuestions[0]?.timeLimit * 60 || 120)
      
      // Auto-start recording for first question
      setTimeout(() => startRecording(), 1000)
    } catch (error) {
      console.error('Error initializing interview:', error)
      alert('Failed to initialize interview. Please check your camera and microphone permissions.')
      navigate('/student-dashboard/applications')
    }
  }

  const generateAIQuestions = async (description) => {
    try {
      // Use a default description if none provided
      const jobDesc = description || `General interview for ${jobTitle || 'this position'} at ${companyName || 'the company'}`;
      
      // Call backend API to generate AI questions
      const response = await screeningInterviewService.generateAIQuestions(
        jobDesc,
        customQuestions.length
      )
      return response.data.questions
    } catch (error) {
      console.error('Error generating AI questions:', error)
      // Fallback to mock questions if API fails
      return [
        {
          id: 'ai_1',
          question: `Based on the job requirements, can you explain your relevant experience and how it aligns with this role?`,
          timeLimit: 2,
          type: 'ai-generated'
        },
        {
          id: 'ai_2',
          question: `What specific skills mentioned in the job description do you possess, and how have you demonstrated them?`,
          timeLimit: 2,
          type: 'ai-generated'
        },
        {
          id: 'ai_3',
          question: `Describe a challenging project you've worked on that relates to the responsibilities of this position.`,
          timeLimit: 2,
          type: 'ai-generated'
        },
        {
          id: 'ai_4',
          question: `How do you stay updated with industry trends and technologies relevant to this role?`,
          timeLimit: 2,
          type: 'ai-generated'
        },
        {
          id: 'ai_5',
          question: `Why are you interested in this position, and what value can you bring to our team?`,
          timeLimit: 2,
          type: 'ai-generated'
        }
      ]
    }
  }

  const startRecording = () => {
    try {
      const stream = videoRef.current?.srcObject
      if (!stream) return

      recordedChunksRef.current = []
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
    } catch (error) {
      console.error('Error starting recording:', error)
    }
  }

  const stopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return

    setIsRecording(false)
    mediaRecorderRef.current.stop()

    // Wait for the final data chunk
    await new Promise(resolve => setTimeout(resolve, 500))

    const currentQuestion = questions[currentQuestionIndex]
    const responseData = {
      questionId: currentQuestion.id || `q_${currentQuestionIndex}`,
      question: currentQuestion.question,
      type: currentQuestion.type,
      recording: new Blob(recordedChunksRef.current, { type: 'video/webm' }),
      duration: (currentQuestion.timeLimit * 60) - timeLeft
    }

    setResponses(prev => [...prev, responseData])

    // Move to next question or finish
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setTimeLeft(questions[currentQuestionIndex + 1].timeLimit * 60 || 120)
      setTimeout(() => startRecording(), 1000)
    } else {
      finishInterview()
    }
  }

  const finishInterview = async () => {
    try {
      // Stop camera stream
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }

      setIsUploading(true)
      setUploadProgress(0)

      // Upload all video recordings to AWS S3
      const videosToUpload = responses.map(r => ({
        blob: r.recording,
        metadata: {
          jobId,
          applicationId,
          questionId: r.questionId,
          questionType: r.type
        }
      }))

      // Upload videos with progress tracking
      const uploadedVideos = await videoUploadService.uploadVideosWithProgress(
        videosToUpload,
        (progress) => {
          setUploadProgress(progress.percentage)
          console.log(`Uploading: ${progress.current}/${progress.total} videos (${progress.percentage}%)`)
        }
      )

      // Prepare responses with video URLs
      const submissionData = {
        jobId,
        responses: responses.map((r, index) => ({
          questionId: r.questionId,
          question: r.question,
          type: r.type,
          duration: r.duration,
          videoUrl: uploadedVideos[index]?.url || null,
          videoKey: uploadedVideos[index]?.key || null,
          timestamp: new Date().toISOString()
        })),
        totalQuestions: questions.length
      }

      // Submit interview to backend with video URLs
      const response = await screeningInterviewService.submitScreeningInterview(
        applicationId,
        submissionData
      )

      setIsUploading(false)

      // Navigate to results with actual score and AI evaluation from backend
      navigate('/student-dashboard/screening-interview/results', {
        state: {
          jobId,
          applicationId,
          jobTitle,
          companyName,
          score: response.data.score,
          totalQuestions: questions.length,
          questionsAnswered: responses.length,
          evaluation: response.data.evaluation // AI strengths, improvements, feedback
        }
      })
    } catch (error) {
      console.error('Error finishing interview:', error)
      setIsUploading(false)
      alert('Failed to submit interview. Please try again.')
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isGeneratingQuestions || questions.length === 0) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Generating interview questions...</p>
          <p className="text-gray-500 text-sm mt-2">AI is analyzing the job description</p>
        </div>
      </DashboardLayout>
    )
  }

  if (isUploading) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600 text-lg font-semibold">Uploading interview videos...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we save your responses to AWS S3</p>
          <div className="w-64 bg-gray-200 rounded-full h-3 mt-4">
            <div 
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
          <p className="text-gray-600 text-sm mt-2">{uploadProgress}% Complete</p>
        </div>
      </DashboardLayout>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Screening Interview</h1>
              <p className="text-gray-600">{jobTitle} - {companyName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Question</p>
                <p className="text-lg font-bold text-blue-600">
                  {currentQuestionIndex + 1} / {questions.length}
                </p>
              </div>
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                timeLeft <= 30 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                <HiClock className="w-5 h-5" />
                <span className="font-bold text-lg">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover mirror"
                />
                
                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    <span className="font-semibold">Recording</span>
                  </div>
                )}

                {/* Question Type Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                    currentQuestion.type === 'custom' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {currentQuestion.type === 'custom' ? 'Employer Question' : 'AI Generated'}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center mt-6 space-x-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <HiVideoCamera className="w-5 h-5" />
                  <span className="text-sm">Camera Active</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <HiMicrophone className="w-5 h-5" />
                  <span className="text-sm">Microphone Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Current Question</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-gray-900 leading-relaxed">{currentQuestion.question}</p>
              </div>

              {currentQuestion.expectedAnswer && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Key Points to Cover:</p>
                  <p className="text-sm text-gray-700">{currentQuestion.expectedAnswer}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Time per question:</span>
                  <span className="font-semibold text-gray-900">{currentQuestion.timeLimit} min</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Questions remaining:</span>
                  <span className="font-semibold text-gray-900">{questions.length - currentQuestionIndex - 1}</span>
                </div>
              </div>

              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className="w-full mt-6 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <HiStop className="w-5 h-5" />
                <span>
                  {currentQuestionIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'}
                </span>
              </button>

              <p className="text-xs text-gray-500 text-center mt-3">
                Answer will be submitted automatically when time runs out
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </DashboardLayout>
  )
}

export default LiveScreeningInterview
