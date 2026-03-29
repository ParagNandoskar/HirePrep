import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiVideoCamera, HiMicrophone, HiPause, HiPlay, HiX, HiCheckCircle, HiChevronRight } from 'react-icons/hi'
import { interviewService } from '../services/interviewService'
import { candidatesAPI } from '../services/api'

const LiveInterview = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])

  const { 
    interviewId, 
    type, 
    role, 
    difficulty, 
    questions: backendQuestions, 
    practiceMode,
    // Job application specific fields
    jobId,
    applicationId,
    jobTitle,
    companyName,
    jobDescription,
    isJobApplication
  } = location.state || {}

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [answers, setAnswers] = useState([])
  const [stream, setStream] = useState(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [loadedQuestions, setLoadedQuestions] = useState(backendQuestions || [])
  const [subscriptionPlan, setSubscriptionPlan] = useState('free')

  // Sample questions based on type
  const questions = {
    technical: [
      {
        id: 1,
        question: "Explain the concept of closures in JavaScript and provide a practical use case.",
        difficulty: "medium",
        category: "JavaScript",
        timeLimit: 300
      },
      {
        id: 2,
        question: "What is the difference between REST and GraphQL APIs? When would you use one over the other?",
        difficulty: "medium",
        category: "API Design",
        timeLimit: 300
      },
      {
        id: 3,
        question: "Describe how you would optimize a slow-performing database query.",
        difficulty: "medium",
        category: "Database",
        timeLimit: 300
      },
      {
        id: 4,
        question: "Explain the SOLID principles in object-oriented programming.",
        difficulty: "hard",
        category: "OOP",
        timeLimit: 300
      },
      {
        id: 5,
        question: "How would you implement authentication and authorization in a web application?",
        difficulty: "medium",
        category: "Security",
        timeLimit: 300
      }
    ],
    hr: [
      {
        id: 1,
        question: "Tell me about yourself and your career journey so far.",
        difficulty: "easy",
        category: "Introduction",
        timeLimit: 180
      },
      {
        id: 2,
        question: "Why do you want to work for our company?",
        difficulty: "easy",
        category: "Motivation",
        timeLimit: 180
      },
      {
        id: 3,
        question: "What are your greatest strengths and weaknesses?",
        difficulty: "medium",
        category: "Self-Assessment",
        timeLimit: 180
      },
      {
        id: 4,
        question: "Where do you see yourself in 5 years?",
        difficulty: "easy",
        category: "Career Goals",
        timeLimit: 180
      },
      {
        id: 5,
        question: "Why should we hire you over other candidates?",
        difficulty: "medium",
        category: "Closing",
        timeLimit: 180
      }
    ],
    behavioral: [
      {
        id: 1,
        question: "Tell me about a time when you faced a challenging problem at work. How did you solve it?",
        difficulty: "medium",
        category: "Problem Solving",
        timeLimit: 240
      },
      {
        id: 2,
        question: "Describe a situation where you had to work with a difficult team member. How did you handle it?",
        difficulty: "medium",
        category: "Teamwork",
        timeLimit: 240
      },
      {
        id: 3,
        question: "Give an example of a time when you had to meet a tight deadline. What did you do?",
        difficulty: "medium",
        category: "Time Management",
        timeLimit: 240
      },
      {
        id: 4,
        question: "Tell me about a time when you failed. What did you learn from it?",
        difficulty: "medium",
        category: "Learning",
        timeLimit: 240
      },
      {
        id: 5,
        question: "Describe a situation where you had to adapt to a significant change at work.",
        difficulty: "medium",
        category: "Adaptability",
        timeLimit: 240
      }
    ]
  }

  // Use backend questions if available, otherwise fallback to mock data
  const currentQuestions = loadedQuestions.length > 0 ? loadedQuestions : (questions[type] || questions.technical)
  const currentQuestion = currentQuestions[currentQuestionIndex]
  const totalQuestions = currentQuestions.length

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        const response = await candidatesAPI.getProfile()
        const profile = response?.data || response
        const plan = profile?.subscription?.plan || 'free'
        setSubscriptionPlan(plan)

        if (practiceMode && !(plan === 'pro' || plan === 'elite')) {
          navigate('/student-dashboard/subscription', {
            state: {
              message: 'Mock interviews are available on Pro and Elite plans.'
            }
          })
          return false
        }
      } catch (error) {
        console.error('Error verifying subscription:', error)
      }
      return true
    }

    const initInterview = async () => {
      const canProceed = await verifySubscription()
      if (!canProceed) return

      // Check if job application mode has required fields
      if (isJobApplication && (!jobId || !applicationId)) {
        navigate('/student-dashboard/applications')
        return
      }

      // Load questions from backend if not in practice mode
      if (!practiceMode && interviewId && loadedQuestions.length === 0) {
        interviewService.getInterviewQuestions(interviewId)
          .then(response => {
            if (response.success && response.data && response.data.questions) {
              setLoadedQuestions(response.data.questions)
            }
          })
          .catch(error => {
            console.error('Error loading questions:', error)
            // Continue with mock questions
          })
      }

      startCamera()
    }

    initInterview()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    let interval
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
      alert('Failed to access camera/microphone')
    }
  }

  const startRecording = () => {
    if (!stream) return

    recordedChunksRef.current = []
    const mediaRecorder = new MediaRecorder(stream)
    mediaRecorderRef.current = mediaRecorder

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data)
      }
    }

    mediaRecorder.start()
    setIsRecording(true)
    setTimeElapsed(0)
  }

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Save answer
      const newAnswer = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        timeSpent: timeElapsed,
        recordingBlob: new Blob(recordedChunksRef.current, { type: 'video/webm' })
      }
      setAnswers([...answers, newAnswer])

      // Submit answer to backend if not in practice mode
      if (!practiceMode && interviewId) {
        try {
          await interviewService.submitAnswer(interviewId, {
            questionId: currentQuestion.id,
            answer: "Video/Audio response recorded", // Backend will process the actual recording
            duration: timeElapsed
          })
        } catch (error) {
          console.error('Error submitting answer:', error)
        }
      }
    }
  }

  const handleNextQuestion = () => {
    stopRecording()
    
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setTimeElapsed(0)
    } else {
      handleEndInterview()
    }
  }

  const handleSkipQuestion = () => {
    if (window.confirm('Are you sure you want to skip this question? This may affect your score.')) {
      handleNextQuestion()
    }
  }

  const togglePause = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume()
      } else {
        mediaRecorderRef.current.pause()
      }
      setIsPaused(!isPaused)
    }
  }

  const handleEndInterview = () => {
    setShowEndConfirm(true)
  }

  const confirmEndInterview = async () => {
    stopRecording()
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    // Call backend to finish interview if not in practice mode
    let finalResults = null
    if (!practiceMode && interviewId) {
      try {
        const response = await interviewService.finishInterview(interviewId)
        if (response.success && response.data) {
          finalResults = response.data.results
        }
      } catch (error) {
        console.error('Error finishing interview:', error)
      }
    }
    
    // Navigate to results page
    navigate('/student-dashboard/interview/results', {
      state: {
        interviewId,
        type,
        role,
        difficulty,
        answers,
        totalQuestions,
        completedQuestions: answers.length,
        results: finalResults,
        practiceMode
      }
    })
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getDifficultyColor = (diff) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    }
    return colors[diff] || colors.medium
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <h1 className="text-xl font-bold text-white capitalize">{type} Interview</h1>
              <p className="text-sm text-gray-400">{role}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-300">Question {currentQuestionIndex + 1} / {totalQuestions}</span>
              </div>
              <div className="px-4 py-2 bg-blue-900 rounded-lg">
                <span className="text-sm font-semibold text-blue-200">{formatTime(timeElapsed)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleEndInterview}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            End Interview
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Video Panel */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 px-3 py-1.5 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-white">Recording</span>
                </div>
              )}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-center space-x-4">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <HiVideoCamera className="w-5 h-5" />
                  <span>Start Recording</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
                  >
                    {isPaused ? <HiPlay className="w-5 h-5" /> : <HiPause className="w-5 h-5" />}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <HiCheckCircle className="w-5 h-5" />
                    <span>Submit Answer</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Question Panel */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(currentQuestion.difficulty)}`}>
                {currentQuestion.difficulty}
              </span>
              <span className="text-sm text-gray-400">{currentQuestion.category}</span>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-6 leading-relaxed">
              {currentQuestion.question}
            </h2>

            <div className="p-4 bg-gray-700 rounded-lg mb-6">
              <p className="text-sm text-gray-300">
                💡 <span className="font-semibold">Tip:</span> Take a moment to structure your answer before you start recording. 
                Use the STAR method (Situation, Task, Action, Result) for behavioral questions.
              </p>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-400">
              <div>
                <span className="font-semibold">Suggested Time:</span> {Math.floor(currentQuestion.timeLimit / 60)} minutes
              </div>
              <div>
                <span className="font-semibold">Time Spent:</span> {formatTime(timeElapsed)}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Progress</h3>
            <div className="flex space-x-2">
              {currentQuestions.map((_, index) => (
                <div
                  key={index}
                  className={`flex-1 h-2 rounded-full ${
                    index < currentQuestionIndex
                      ? 'bg-green-500'
                      : index === currentQuestionIndex
                      ? 'bg-blue-500'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-400">
              {answers.length} of {totalQuestions} questions completed
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={handleSkipQuestion}
                className="w-full px-4 py-2 bg-gray-700 text-gray-300 font-medium rounded-lg hover:bg-gray-600 transition-colors text-left flex items-center justify-between"
              >
                <span>Skip Question (with penalty)</span>
                <HiChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={handleEndInterview}
                className="w-full px-4 py-2 bg-red-900 text-red-200 font-medium rounded-lg hover:bg-red-800 transition-colors text-left flex items-center justify-between"
              >
                <span>End Interview Early</span>
                <HiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* End Interview Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-8 max-w-md border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">End Interview?</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to end the interview? You have completed {answers.length} out of {totalQuestions} questions.
            </p>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
              >
                Continue Interview
              </button>
              <button
                onClick={confirmEndInterview}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
              >
                End Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveInterview
