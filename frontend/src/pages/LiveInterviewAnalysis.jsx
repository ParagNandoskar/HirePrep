import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { HiVideoCamera, HiMicrophone, HiChevronRight, HiCheckCircle } from 'react-icons/hi'
import { FaSpinner } from 'react-icons/fa'
import { interviewService } from '../services/interviewService'
import { analysisService, InterviewRecordingManager, mediaHelpers } from '../services/analysisService'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'

/**
 * Live Interview with Real-Time Video/Audio Analysis
 * 
 * Features:
 * - Real-time video streaming with emotion detection
 * - Audio recording with voice quality analysis
 * - Automatic leaderboard update after interview
 */
const LiveInterviewAnalysis = () => {
  const { jobId } = useParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const recordingManagerRef = useRef(null)

  const [interview, setInterview] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isRecordingAnswer, setIsRecordingAnswer] = useState(false)
  const [answer, setAnswer] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analysisStatus, setAnalysisStatus] = useState(null)

  // Initialize interview
  useEffect(() => {
    startInterview()
    return () => {
      // Cleanup on unmount
      if (recordingManagerRef.current) {
        recordingManagerRef.current.stopRecording()
      }
    }
  }, [])

  const startInterview = async () => {
    try {
      setLoading(true)
      
      // Start interview session
      const response = await interviewService.startInterview({
        jobId,
        type: 'screening',
        duration: 30
      })

      if (response.success) {
        setInterview(response.data.interview)
        setQuestions(response.data.interview.questions || [])
        
        // Initialize recording manager
        recordingManagerRef.current = new InterviewRecordingManager(
          response.data.interview.id,
          videoRef.current
        )
        
        // Start video/audio stream
        await recordingManagerRef.current.startRecording()
        
        setLoading(false)
      }
    } catch (err) {
      console.error('Failed to start interview:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const startAnswering = () => {
    if (!recordingManagerRef.current) return

    setIsRecordingAnswer(true)
    setAnswer('')
    
    // Start recording for this question
    recordingManagerRef.current.startAnswerRecording(
      questions[currentQuestionIndex].id
    )
  }

  const stopAnswering = async () => {
    if (!recordingManagerRef.current) return

    setIsRecordingAnswer(false)
    setIsProcessing(true)

    try {
      // Stop recording and get audio data
      const audioData = await recordingManagerRef.current.stopAnswerRecording()

      // Capture final frame for this answer
      const frameBase64 = await mediaHelpers.captureVideoFrame(videoRef.current, 0.8)

      // Convert audio to base64
      let audioBase64 = null
      if (audioData && audioData.blob) {
        audioBase64 = await mediaHelpers.prepareAudioForAnalysis(audioData.blob)
      }

      // Process complete answer with analysis
      const response = await analysisService.processInterviewAnswer({
        interviewId: interview.id,
        questionId: questions[currentQuestionIndex].id,
        videoBase64: frameBase64,
        audioBase64: audioBase64,
        transcript: answer,
        question: questions[currentQuestionIndex].question,
        answer: answer
      })

      if (response.success) {
        setAnalysisStatus({
          videoScore: response.data.analysisResult.videoAnalysis?.score || 0,
          audioScore: response.data.analysisResult.audioAnalysis?.score || 0,
          combinedScore: response.data.combinedScore
        })

        // Move to next question after 2 seconds
        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
            setAnalysisStatus(null)
            setAnswer('')
          } else {
            // Interview complete
            finalizeInterview()
          }
          setIsProcessing(false)
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to process answer:', err)
      setError('Failed to process your answer. Please try again.')
      setIsProcessing(false)
    }
  }

  const finalizeInterview = async () => {
    try {
      setIsProcessing(true)
      
      // Stop recording
      if (recordingManagerRef.current) {
        recordingManagerRef.current.stopRecording()
      }

      // Finalize interview and update leaderboard
      const response = await analysisService.finalizeInterview(interview.id)

      if (response.success) {
        // Navigate to results page
        navigate('/interview-results', {
          state: {
            interviewId: interview.id,
            scores: response.data,
            jobId: jobId
          }
        })
      }
    } catch (err) {
      console.error('Failed to finalize interview:', err)
      setError('Failed to finalize interview. Redirecting...')
      setTimeout(() => navigate('/dashboard'), 3000)
    }
  }

  if (loading) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin text-6xl text-blue-500 mx-auto mb-4" />
            <p className="text-xl text-gray-600">Starting your interview...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-xl text-gray-800 mb-2">Something went wrong</p>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-6xl mx-auto p-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentQuestionIndex) / questions.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Video Panel */}
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video relative">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover mirror"
              />
              
              {/* Recording Indicator */}
              {isRecordingAnswer && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Recording</span>
                </div>
              )}

              {/* Analysis Status Overlay */}
              {analysisStatus && (
                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                  <div className="text-center text-white">
                    <HiCheckCircle className="text-6xl text-green-400 mx-auto mb-4" />
                    <p className="text-xl font-semibold mb-2">Answer Recorded!</p>
                    <div className="space-y-1 text-sm">
                      <p>Video Analysis: {analysisStatus.videoScore}/100</p>
                      <p>Audio Analysis: {analysisStatus.audioScore}/100</p>
                      <p className="text-lg font-bold text-green-400 mt-2">
                        Score: {analysisStatus.combinedScore}/100
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Camera/Mic Status */}
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <HiVideoCamera className="text-green-500" />
                <span>Camera Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <HiMicrophone className="text-green-500" />
                <span>Microphone Active</span>
              </div>
            </div>
          </div>

          {/* Question Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="mb-6">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                  {currentQuestion?.type || 'Question'}
                </span>
                <h2 className="text-2xl font-bold text-gray-900 leading-relaxed">
                  {currentQuestion?.question}
                </h2>
              </div>

              {/* Answer Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer (Optional - for transcript)
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={!isRecordingAnswer}
                  placeholder="Type your answer here or just speak..."
                  className="w-full h-40 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Controls */}
              <div className="flex space-x-4">
                {!isRecordingAnswer ? (
                  <button
                    onClick={startAnswering}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <HiMicrophone />
                    <span>Start Answering</span>
                  </button>
                ) : (
                  <button
                    onClick={stopAnswering}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <HiCheckCircle />
                    <span>Submit Answer</span>
                  </button>
                )}
              </div>

              {isProcessing && (
                <div className="mt-4 flex items-center justify-center space-x-2 text-gray-600">
                  <FaSpinner className="animate-spin" />
                  <span>Processing your answer...</span>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Interview Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Look at the camera to maintain eye contact</li>
                <li>• Speak clearly and at a moderate pace</li>
                <li>• Minimize filler words ("um", "uh", "like")</li>
                <li>• Show confidence through your body language</li>
              </ul>
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

export default LiveInterviewAnalysis
