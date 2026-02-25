import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiMicrophone, HiVolumeUp, HiX, HiCheckCircle, HiChevronRight, HiPause, HiPlay } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { speechRecognition } from '../services/speechRecognition'
import geminiVoiceService from '../services/geminiVoiceService'
import { useAuth } from '../context/AuthContext'

const AIVoiceInterview = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const { 
    jobId, 
    applicationId, 
    jobTitle, 
    companyName,
    jobDescription,
    isJobApplication,
    type,
    role
  } = location.state || {}

  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [error, setError] = useState(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [stream, setStream] = useState(null)
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [videoRecordings, setVideoRecordings] = useState([])
  const [interviewComplete, setInterviewComplete] = useState(false)
  const [videoFrames, setVideoFrames] = useState([])
  const [audioChunks, setAudioChunks] = useState([])
  const frameIntervalRef = useRef(null)
  const audioChunksRef = useRef([])
  const canvasRef = useRef(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isSpeechMuted, setIsSpeechMuted] = useState(false)
  const cameraInitializedRef = useRef(false)

  // Video debug logging removed - enable only if debugging video issues
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (videoRef.current) {
  //       console.log('🎥 Video Debug:', {
  //         hasStream: !!videoRef.current.srcObject,
  //         paused: videoRef.current.paused,
  //         readyState: videoRef.current.readyState,
  //         videoWidth: videoRef.current.videoWidth,
  //         videoHeight: videoRef.current.videoHeight
  //       })
  //     }
  //   }, 3000)
  //   
  //   return () => clearInterval(interval)
  // }, [])


  useEffect(() => {
    // Redirect if missing required data
    if (isJobApplication && (!jobId || !applicationId)) {
      navigate('/student-dashboard/applications')
      return
    }

    // Guard against React StrictMode double-invocation
    if (cameraInitializedRef.current) return
    cameraInitializedRef.current = true

    startCamera()
    initializeInterview()

    return () => {
      // Cleanup camera on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      console.log('📷 Requesting camera access...')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      })
      
      // Setting stream triggers the useEffect that attaches & plays video
      setStream(mediaStream)
    } catch (error) {
      console.error('❌ Camera access error:', error)
      setError('Camera access denied. Video recording will be disabled.')
    }
  }

  // Video ref callback - called when video element mounts
  // Only set srcObject here; playing is handled by the stream useEffect below
  const videoRefCallback = (element) => {
    videoRef.current = element
    
    if (element && stream && !element.srcObject) {
      element.srcObject = stream
      element.muted = true
      element.playsInline = true
    }
  }

  // When stream becomes available, attach it to the video element and play
  useEffect(() => {
    if (!stream || !videoRef.current) return

    const videoElement = videoRef.current
    if (videoElement.srcObject !== stream) {
      videoElement.srcObject = stream
      videoElement.muted = true
      videoElement.playsInline = true
    }

    videoElement.play()
      .then(() => setIsVideoPlaying(true))
      .catch(err => {
        // Ignore AbortError — a subsequent play() call will succeed
        if (err.name !== 'AbortError') console.error('Video play error:', err)
      })
  }, [stream])

  const initializeInterview = async () => {
    try {
      setIsLoadingQuestions(true)
      
      // Initialize Gemini AI interview session
      // Use 'practice' as jobId for practice interviews
      const response = await geminiVoiceService.initializeInterview(
        jobId || 'practice',
        applicationId,
        user?.name || 'Candidate'
      )
      
      setSessionId(response.sessionId)
      
      // Get first question (but don't speak it yet)
      const questionResponse = await geminiVoiceService.getNextQuestion(response.sessionId)
      
      setCurrentQuestion(questionResponse.question)
      setQuestionNumber(questionResponse.questionNumber)
      
      // Finish loading first
      setIsLoadingQuestions(false)
      
      // Wait a moment for UI to render, then speak
      setTimeout(async () => {
        // Load voices if not loaded yet
        if (window.speechSynthesis.getVoices().length === 0) {
          await new Promise(resolve => {
            window.speechSynthesis.onvoiceschanged = resolve;
            setTimeout(resolve, 1000);
          });
        }
        
        // Now speak the question
        await speakQuestion(questionResponse.question)
      }, 500)
    } catch (error) {
      console.error('Error initializing interview:', error)
      setError('Failed to initialize interview. Please try again.')
      setIsLoadingQuestions(false)
    }
  }

  const getNextQuestion = async (sid = sessionId) => {
    try {
      const response = await geminiVoiceService.getNextQuestion(sid)
      
      setCurrentQuestion(response.question)
      setQuestionNumber(response.questionNumber)
      
      // Speak the question automatically for subsequent questions
      await speakQuestion(response.question)
    } catch (error) {
      console.error('Error getting next question:', error)
      setError('Failed to get next question.')
    }
  }

  const speakQuestion = async (questionText) => {
    try {
      // Cancel any ongoing speech first
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      // Skip speaking if muted
      if (isSpeechMuted) {
        console.log('🔇 Speech is muted, skipping audio playback');
        return;
      }
      
      setIsAISpeaking(true)
      
      // Play audio using browser TTS
      await geminiVoiceService.playQuestionAudio(questionText, 'professional_female')
      
      setIsAISpeaking(false)
    } catch (error) {
      console.error('Error speaking question:', error)
      setError('Failed to play question audio.')
      setIsAISpeaking(false)
    }
  }

  const toggleSpeechMute = () => {
    setIsSpeechMuted(!isSpeechMuted)
    // Cancel any ongoing speech when muting
    if (!isSpeechMuted && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsAISpeaking(false);
    }
  }

  const replayQuestion = async () => {
    if (currentQuestion && !isAISpeaking) {
      await speakQuestion(currentQuestion)
    }
  }

  const startListening = () => {
    if (!speechRecognition.isSupported()) {
      setError('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
      return
    }

    // Prevent starting if already listening
    if (speechRecognition.isActive()) {
      console.warn('Speech recognition already active, ignoring start request');
      return;
    }

    setCurrentTranscript('')
    setInterimTranscript('')
    setError(null)

    // Start video recording
    startVideoRecording()

    const started = speechRecognition.start({
      onResult: (result) => {
        if (result.isFinal) {
          setCurrentTranscript(prev => prev + ' ' + result.transcript)
          setInterimTranscript('')
        } else {
          setInterimTranscript(result.interim)
        }
      },
      onEnd: () => {
        setIsListening(false)
      },
      onError: (error) => {
        console.error('Speech recognition error:', error)
        setIsListening(false)
        
        if (error === 'no-speech') {
          setError('No speech detected. Please try again.')
        } else if (error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access.')
        } else if (error !== 'aborted') {
          // Don't show error for aborted (user stopped intentionally)
          setError('Speech recognition error. Please try again.')
        }
      }
    })

    if (started) {
      setIsListening(true)
    }
  }

  const stopListening = () => {
    const finalTranscript = speechRecognition.stop()
    setIsListening(false)
    setCurrentTranscript(finalTranscript)
    setInterimTranscript('')
    
    // Stop video recording
    stopVideoRecording()
  }

  const startVideoRecording = () => {
    if (!stream) {
      console.warn('⚠️ [VideoRecording] No camera stream — skipping')
      return
    }

    console.log('🎬 [VideoRecording] startVideoRecording called, stream active:', stream.active)

    // Reset arrays for new answer
    setVideoFrames([])
    setAudioChunks([])
    audioChunksRef.current = []
    recordedChunksRef.current = []
    
    try {
      // Start MediaRecorder for audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
          
          // Convert audio chunk to base64 for behavioral analysis
          const reader = new FileReader()
          reader.onloadend = () => {
            const base64Audio = reader.result.split(',')[1]
            audioChunksRef.current.push(base64Audio)
          }
          reader.readAsDataURL(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        setVideoRecordings(prev => [...prev, blob])
        setAudioChunks(audioChunksRef.current)
        recordedChunksRef.current = []
      }

      // Request data every 2 seconds for audio analysis
      mediaRecorder.start(2000)
      mediaRecorderRef.current = mediaRecorder
      
      // Capture video frames every 2 seconds for facial analysis
      startFrameCapture()
      
      console.log('📹 Video recording & behavioral tracking started')
    } catch (error) {
      console.error('Video recording error:', error)
    }
  }

  const startFrameCapture = () => {
    console.log('🔍 [FrameCapture] startFrameCapture called, videoRef.current:', !!videoRef.current)
    if (!videoRef.current) {
      console.warn('⚠️ [FrameCapture] videoRef.current is null — frame capture ABORTED')
      return
    }

    // Create canvas for frame extraction
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }

    const canvas = canvasRef.current
    const video = videoRef.current
    const ctx = canvas.getContext('2d')

    let frameCount = 0
    const captureInterval = 2000 // ms
    console.log(`📹 [FrameCapture] Started — capturing 1 frame every ${captureInterval}ms (${1000/captureInterval * 60} frames/min)`)

    // Capture frame every 2 seconds
    frameIntervalRef.current = setInterval(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convert to base64
        const frameData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
        frameCount++
        setVideoFrames(prev => {
          const newTotal = prev.length + 1
          console.log(`📸 [FrameCapture] Frame #${frameCount} captured | Total buffered: ${newTotal} | Size: ${(frameData.length / 1024).toFixed(1)}KB`)
          return [...prev, frameData]
        })
      } else {
        console.warn(`⚠️ [FrameCapture] Skipped — video not ready (${video.videoWidth}x${video.videoHeight})`)
      }
    }, captureInterval)
  }

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      console.log('📹 Video recording stopped')
    }

    // Stop frame capture
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }
  }

  const submitAnswer = async () => {
    const answerText = currentTranscript.trim()

    if (!answerText) {
      setError('Please provide an answer before submitting.')
      return
    }

    try {
      console.log(`📊 [Submit] Sending answer with ${videoFrames.length} frames and ${audioChunksRef.current.length} audio chunks to backend`)
      
      // Submit answer with behavioral data to backend
      await geminiVoiceService.submitAnswer(
        sessionId,
        answerText,
        currentQuestion,         // persist the question text for context reconstruction
        videoFrames,
        audioChunksRef.current,  // use ref — always current, not affected by async state lag
        questionNumber,
        user?._id
      )

      // Clear transcript and behavioral data
      setCurrentTranscript('')
      setInterimTranscript('')
      setVideoFrames([])
      setAudioChunks([])
      setError(null)

      // Check if interview should continue
      if (questionNumber < 5) {
        // Get next question
        await getNextQuestion()
      } else {
        // Interview complete
        await finishInterview()
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
      setError('Failed to submit answer. Please try again.')
    }
  }

  const finishInterview = async () => {
    try {
      setInterviewComplete(true)
      
      // Get final analysis from Gemini
      const analysis = await geminiVoiceService.completeInterview(sessionId, applicationId)

      // Navigate to results
      navigate('/student-dashboard/screening-interview/results', {
        state: {
          jobId,
          applicationId,
          jobTitle,
          companyName,
          score: analysis.overallScore,
          scores: {
            communication: analysis.communicationScore,
            technical: analysis.technicalScore,
            problemSolving: analysis.problemSolvingScore,
            culturalFit: analysis.culturalFitScore
          },
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          insights: analysis.insights,
          recommendation: analysis.recommendation,
          totalQuestions: 5,
          questionsAnswered: questionNumber, // Track actual questions answered
          behavioralScore: analysis.behavioralScore,
          contentScore: analysis.contentScore,
          videoScore: analysis.videoScore,
          audioScore: analysis.audioScore,
          behavioralInsights: analysis.behavioralInsights
        }
      })

    } catch (error) {
      console.error('Error completing interview:', error)
      setError('Failed to complete interview. Please try again.')
    }
  }

  if (isLoadingQuestions) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparing your AI interview...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const progress = (questionNumber / 5) * 100

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Voice Interview</h1>
              <p className="text-gray-600 mt-1">
                {jobTitle || 'Interview'} - {companyName || 'Practice Interview'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Question</p>
              <p className="text-2xl font-bold text-blue-600">
                {questionNumber} / 5
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left: Camera View */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden relative aspect-video">
              <video
                ref={videoRefCallback}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)', backgroundColor: '#1f2937', minHeight: '100%' }}
                onLoadedMetadata={(e) => {
                  console.log('📹 Video metadata loaded:', {
                    width: e.target.videoWidth,
                    height: e.target.videoHeight
                  })
                }}
                onCanPlay={() => console.log('✅ Video can play')}
                onPlay={() => {
                  console.log('▶️ Video started playing')
                  setIsVideoPlaying(true)
                }}
              />
              
              {/* Recording Indicator */}
              {isListening && (
                <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-sm font-semibold">Recording</span>
                </div>
              )}

              {/* Camera Status Indicator */}
              <div className="absolute bottom-4 left-4">
                {stream ? (
                  <div className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Camera Active</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-yellow-600 text-white px-3 py-1 rounded-full text-xs">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Initializing Camera...</span>
                  </div>
                )}
              </div>

              {/* Camera Access Required Overlay */}
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                  <div className="text-center px-4">
                    <p className="text-white text-sm mb-2">Camera access required</p>
                    <p className="text-gray-300 text-xs">Please allow camera permissions to continue</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Question Card */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-8"
style={{ minHeight: '300px' }}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <HiVolumeUp className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    {currentQuestion}
                  </h2>

                  {/* AI Speaking Indicator */}
                  {isAISpeaking && (
                    <div className="flex items-center space-x-2 text-blue-600 mb-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm font-medium">AI is speaking...</span>
                    </div>
                  )}

                  {/* Replay and Mute Buttons */}
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={replayQuestion}
                      disabled={isAISpeaking || isSpeechMuted}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                    >
                      <HiVolumeUp className="w-5 h-5" />
                      <span className="text-sm font-medium">Replay Question</span>
                    </button>
                    
                    <button
                      onClick={toggleSpeechMute}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                        isSpeechMuted 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={isSpeechMuted ? 'Unmute question audio' : 'Mute question audio'}
                    >
                      {isSpeechMuted ? (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-medium">Unmute</span>
                        </>
                      ) : (
                        <>
                          <HiVolumeUp className="w-5 h-5" />
                          <span className="text-sm font-medium">Mute</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript Display */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Answer:</h3>
          
          <div className="min-h-[120px] bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
            {currentTranscript || interimTranscript ? (
              <p className="text-gray-900">
                {currentTranscript}
                {interimTranscript && (
                  <span className="text-gray-400 italic"> {interimTranscript}</span>
                )}
              </p>
            ) : (
              <p className="text-gray-400 italic">
                Click "Start Speaking" to begin recording your answer...
              </p>
            )}
          </div>

          {/* Microphone Controls */}
          <div className="mt-6 flex items-center justify-center space-x-4">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={isAISpeaking}
                className="flex items-center space-x-3 px-8 py-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 transition-all"
              >
                <HiMicrophone className="w-6 h-6" />
                <span className="font-semibold text-lg">Start Speaking</span>
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="flex items-center space-x-3 px-8 py-4 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg animate-pulse"
              >
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                <span className="font-semibold text-lg">Recording... Click to Stop</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end">
            <button
              onClick={submitAnswer}
              disabled={!currentTranscript || isListening || isAISpeaking}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="font-semibold">Submit Answer</span>
              <HiChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* End Interview Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <HiX className="w-5 h-5" />
            <span>End Interview Early</span>
          </button>
        </div>

        {/* End Confirm Modal */}
        {showEndConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md">
              <h3 className="text-lg font-semibold mb-3">End Interview?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to end the interview? You've completed {questionNumber} of 5 questions.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={finishInterview}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  End Interview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default AIVoiceInterview
