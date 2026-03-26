import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiMicrophone, HiVolumeUp, HiChevronRight } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { speechRecognition } from '../services/speechRecognition'
import geminiVoiceService from '../services/geminiVoiceService'
import { useAuth } from '../context/AuthContext'
import { candidatesAPI } from '../services/api'

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
    role,
    mockJobDetails
  } = location.state || {}

  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [questionNumber, setQuestionNumber] = useState(0)
  const [estimatedTotalQuestions, setEstimatedTotalQuestions] = useState(6)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
  const [error, setError] = useState(null)
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
  const [soundChecked, setSoundChecked] = useState(false)
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [appSwitchCount, setAppSwitchCount] = useState(0)
  const cameraInitializedRef = useRef(false)
  const lastVisibilitySwitchAtRef = useRef(0)
  const lastBlurSwitchAtRef = useRef(0)

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
    const bootstrap = async () => {
      // Redirect if missing required data for real interviews
      if (isJobApplication && (!jobId || !applicationId)) {
        navigate('/student-dashboard/applications')
        return
      }

      // Mock interviews are premium-only
      if (!isJobApplication) {
        try {
          const response = await candidatesAPI.getProfile()
          const profile = response?.data || response
          const plan = (profile?.subscription?.plan || 'free').toLowerCase()
          const isPremium = plan === 'pro' || plan === 'elite'

          if (!isPremium) {
            navigate('/student-dashboard/subscription', {
              state: { message: 'Mock interviews are available on Pro and Elite plans.' }
            })
            return
          }
        } catch (err) {
          console.error('Failed to verify subscription:', err)
          navigate('/student-dashboard/subscription', {
            state: { message: 'Unable to verify plan. Please try again.' }
          })
          return
        }
      }

      // Guard against React StrictMode double-invocation
      if (cameraInitializedRef.current) return
      cameraInitializedRef.current = true

      startCamera()
    }

    bootstrap()

    return () => {
      speechRecognition.stop()

      // Cleanup camera on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen()
        }
      } catch (err) {
        console.warn('Fullscreen request was blocked:', err)
      }
    }

    requestFullscreen()
  }, [])

  useEffect(() => {
    if (!interviewStarted) return

    const handleVisibilityChange = () => {
      if (!document.hidden) return
      const now = Date.now()
      if (now - lastVisibilitySwitchAtRef.current < 700) return
      lastVisibilitySwitchAtRef.current = now
      setTabSwitchCount(prev => prev + 1)
    }

    const handleWindowBlur = () => {
      const now = Date.now()
      if (now - lastBlurSwitchAtRef.current < 700) return
      lastBlurSwitchAtRef.current = now
      setAppSwitchCount(prev => prev + 1)
    }

    const blockClipboardAction = (event) => {
      event.preventDefault()
      setError('Copy, paste, cut, and context menu are disabled during interview mode.')
    }

    const handleKeyDown = (event) => {
      const blockedCombo = (event.ctrlKey || event.metaKey) && ['c', 'v', 'x', 'a', 'p', 's'].includes(event.key.toLowerCase())
      if (blockedCombo) {
        event.preventDefault()
        setError('Clipboard and save/print shortcuts are disabled during interview mode.')
        return
      }

      const isSpace = event.code === 'Space' || event.key === ' '
      const isTypingField = ['INPUT', 'TEXTAREA'].includes(event.target?.tagName) || event.target?.isContentEditable

      if (isSpace && !event.repeat && !isTypingField) {
        event.preventDefault()
        if (isAISpeaking) return

        if (isListening) {
          stopListening()
        } else {
          startListening()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('copy', blockClipboardAction)
    window.addEventListener('cut', blockClipboardAction)
    window.addEventListener('paste', blockClipboardAction)
    window.addEventListener('contextmenu', blockClipboardAction)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('copy', blockClipboardAction)
      window.removeEventListener('cut', blockClipboardAction)
      window.removeEventListener('paste', blockClipboardAction)
      window.removeEventListener('contextmenu', blockClipboardAction)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [interviewStarted, isAISpeaking, isListening, isTranscribing])

  const startInterviewSession = async () => {
    if (!stream) {
      setError('Camera and microphone permissions are required before starting.')
      return
    }

    setError(null)
    setInterviewStarted(true)
    await initializeInterview()
  }

  const testSound = async () => {
    try {
      setError(null)
      await geminiVoiceService.playQuestionAudio('Audio check successful. You can start your interview now.')
      setSoundChecked(true)
    } catch (err) {
      setError('Unable to play audio check. Please verify speaker permissions.')
    }
  }

  const normalizeTranscript = (input) => {
    if (!input) return ''

    const correctionRules = [
      [/\bfull\s+struck\b/gi, 'full stack'],
      [/\bman\s*go\s*db\b/gi, 'MongoDB'],
      [/\bmango\s*db\b/gi, 'MongoDB'],
      [/\bmango\s*diversity\b/gi, 'MongoDB'],
      [/\bmangodiversity\b/gi, 'MongoDB'],
      [/\breact\s+js\b/gi, 'React'],
      [/\bnode\s+js\b/gi, 'Node.js'],
      [/\bjava\s+script\b/gi, 'JavaScript'],
      [/\bpost\s+in\s+my\s+bachelors\b/gi, 'pursuing my bachelor\'s'],
      [/\bin\s+industries\b/gi, 'in the industry']
    ]

    let normalized = input
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .trim()

    correctionRules.forEach(([pattern, replacement]) => {
      normalized = normalized.replace(pattern, replacement)
    })

    return normalized
  }

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
        user?.name || 'Candidate',
        mockJobDetails || null
      )
      
      setSessionId(response.sessionId)
      
      // Get first question (but don't speak it yet)
      const questionResponse = await geminiVoiceService.getNextQuestion(response.sessionId)
      
      setCurrentQuestion(questionResponse.question)
      setQuestionNumber(questionResponse.questionNumber)
      if (questionResponse.estimatedTotalQuestions) {
        setEstimatedTotalQuestions(questionResponse.estimatedTotalQuestions)
      }
      
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
      if (response.estimatedTotalQuestions) {
        setEstimatedTotalQuestions(response.estimatedTotalQuestions)
      }
      
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

  const startListening = async () => {
    if (!speechRecognition.isSupported()) {
      setError('Audio recording is not supported in your browser. Please use a modern browser.')
      return
    }

    // Prevent starting if already listening
    if (speechRecognition.isActive() || isTranscribing) {
      console.warn('Speech recognition already active, ignoring start request');
      return;
    }

    setCurrentTranscript('')
    setInterimTranscript('')
    setError(null)

    // Start video recording
    startVideoRecording()

    const started = await speechRecognition.start({
      onResult: (result) => {
        const normalizedFinal = normalizeTranscript(result.transcript || result.fullTranscript || '')
        setCurrentTranscript(normalizedFinal)
        setInterimTranscript(result.interim || '')
        console.log('📝 [Interview Transcript]', {
          rawFinal: result.transcript || '',
          rawFull: result.fullTranscript || '',
          correctedFinal: normalizedFinal,
          interim: result.interim || ''
        })
      },
      onEnd: () => {
        setIsListening(false)
        setIsTranscribing(false)
      },
      onError: (error) => {
        console.error('Speech recognition error:', error)
        setIsListening(false)
        setIsTranscribing(false)
        
        if (error === 'no-speech' || error === 'aborted') {
          return
        } else if (error === 'not-allowed') {
          setError('Microphone permission denied. Please allow microphone access.')
        } else if (error === 'no-microphone') {
          setError('No microphone detected. Please connect a microphone and try again.')
        } else if (String(error).includes('missing-api-config')) {
          setError('Missing speech API config. Set VITE_XAI_API_KEY, VITE_XAI_MODEL, and VITE_TRANSCRIPTION_API_URL in frontend .env.')
        } else if (String(error).startsWith('api-error:')) {
          const [, status, ...detailParts] = String(error).split(':')
          const details = detailParts.join(':')
          setError(`Transcription API error (${status}). ${details || 'Please verify API key and model.'}`)
        } else {
          setError('Transcription failed. Please try again.')
        }
      }
    })

    if (started) {
      setIsListening(true)
    } else {
      stopVideoRecording()
    }
  }

  const stopListening = async () => {
    if (isTranscribing) return

    setIsListening(false)
    setIsTranscribing(true)

    try {
      const finalTranscript = await speechRecognition.stop()
      const normalizedFinal = normalizeTranscript((finalTranscript || '').trim())
      setCurrentTranscript(normalizedFinal)
      setInterimTranscript('')
      console.log('📝 [Interview Transcript Final]', {
        rawFinal: (finalTranscript || '').trim(),
        correctedFinal: normalizedFinal
      })
    } finally {
      setIsTranscribing(false)
      stopVideoRecording()
    }
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
    const answerText = normalizeTranscript(currentTranscript.trim())

    if (!answerText) {
      setError('Please provide an answer before submitting.')
      return
    }

    try {
      console.log(`📊 [Submit] Sending answer with ${videoFrames.length} frames and ${audioChunksRef.current.length} audio chunks to backend`)
      
      // Submit answer with behavioral data to backend
      const submitResponse = await geminiVoiceService.submitAnswer(
        sessionId,
        answerText,
        currentQuestion,         // persist the question text for context reconstruction
        videoFrames,
        audioChunksRef.current,  // use ref — always current, not affected by async state lag
        questionNumber,
        user?._id
      )

      if (submitResponse?.estimatedTotalQuestions) {
        setEstimatedTotalQuestions(submitResponse.estimatedTotalQuestions)
      }

      // Clear transcript and behavioral data
      setCurrentTranscript('')
      setInterimTranscript('')
      setVideoFrames([])
      setAudioChunks([])
      setError(null)

      // Dynamic completion decision comes from backend AI assessment.
      if (submitResponse?.shouldComplete) {
        await finishInterview()
      } else {
        await getNextQuestion()
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
      const analysis = await geminiVoiceService.completeInterview(sessionId, applicationId, {
        tabSwitches: tabSwitchCount,
        appSwitches: appSwitchCount,
        totalSwitches: tabSwitchCount + appSwitchCount
      })

      if (isJobApplication) {
        navigate('/student-dashboard/screening-interview/results', {
          state: {
            jobId,
            applicationId,
            jobTitle,
            companyName,
            score: analysis.overallScore,
            totalQuestions: estimatedTotalQuestions,
            questionsAnswered: questionNumber
          }
        })
      } else {
        navigate('/student-dashboard/results', {
          state: {
            mockInterviewId: analysis.mockInterviewId || null
          }
        })
      }

    } catch (error) {
      console.error('Error completing interview:', error)
      setError('Failed to complete interview. Please try again.')
    }
  }

  if (!interviewStarted) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student" focusMode={false} hideSidebar={false}>
        <div className="max-w-6xl mx-auto space-y-6 pb-8">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-6">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Screening Interview Setup</h1>
            <p className="text-slate-600 mt-2">Allow camera, microphone, and sound checks before starting the interview.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
            <div className="lg:col-span-3">
              <div className="bg-slate-900 rounded-2xl shadow-[0_16px_40px_rgba(15,23,42,0.35)] ring-1 ring-slate-700/50 overflow-hidden relative h-[40vh] min-h-[300px] lg:h-[62vh] lg:min-h-[540px]">
                <video
                  ref={videoRefCallback}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)', backgroundColor: '#1f2937', minHeight: '100%' }}
                />
                {!stream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm">
                    <div className="text-center px-4">
                      <p className="text-white text-sm mb-2">Camera access required</p>
                      <p className="text-slate-300 text-xs">Please allow camera and microphone permissions</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-blue-100/70 shadow-[0_12px_30px_rgba(37,99,235,0.12)] p-5 lg:p-6 h-full flex flex-col gap-4">
                <h2 className="text-xl font-bold text-slate-900">Before You Start</h2>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Camera: {stream ? 'Ready' : 'Pending permission'}</p>
                  <p>Microphone: {stream?.getAudioTracks?.().length ? 'Ready' : 'Pending permission'}</p>
                  <p>Sound Check: {soundChecked ? 'Completed' : 'Pending'}</p>
                </div>

                <button
                  onClick={testSound}
                  className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  Test Sound
                </button>

                <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                  <p className="font-semibold text-slate-900">Interview Rules</p>
                  <p>1. Keep this interview tab active at all times.</p>
                  <p>2. Do not switch tabs/apps; all focus changes are recorded.</p>
                  <p>3. Use Space to start/stop recording for each answer.</p>
                  <p>4. Pauses are recorded as part of your response.</p>
                  <p>5. Five or more switches are treated as a red flag during evaluation.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  onClick={startInterviewSession}
                  disabled={!stream}
                  className="mt-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_22px_rgba(37,99,235,0.35)]"
                >
                  Start Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoadingQuestions) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student" focusMode={interviewStarted} hideSidebar={interviewStarted}>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Preparing your AI interview...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student" focusMode={interviewStarted} hideSidebar={interviewStarted}>
      <div className="max-w-6xl mx-auto space-y-6 pb-8">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/70 shadow-[0_12px_40px_rgba(15,23,42,0.08)] p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">AI Voice Interview</h1>
              <p className="text-slate-600 mt-1 text-base">
                {jobTitle || 'Interview'} - {companyName || 'Practice Interview'}
              </p>
            </div>
            <div className="text-right">
              <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-100 text-blue-700 border border-blue-200">
                Adaptive Mode
              </p>
              <p className="text-sm text-slate-600 mt-2">Tab switches: {tabSwitchCount} | App switches: {appSwitchCount}</p>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6 items-stretch">
          {/* Left: Camera View */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900 rounded-2xl shadow-[0_16px_40px_rgba(15,23,42,0.35)] ring-1 ring-slate-700/50 overflow-hidden relative h-[36vh] min-h-[290px] lg:h-[62vh] lg:min-h-[540px]">
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
                <div className="absolute top-4 right-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full animate-pulse shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  <span className="text-sm font-semibold">Recording</span>
                </div>
              )}

              {/* Camera Status Indicator */}
              <div className="absolute bottom-4 left-4">
                {stream ? (
                  <div className="flex items-center space-x-2 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs shadow-md">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span>Camera Active</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-amber-600 text-white px-3 py-1 rounded-full text-xs shadow-md">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <span>Initializing Camera...</span>
                  </div>
                )}
              </div>

              {/* Camera Access Required Overlay */}
              {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm">
                  <div className="text-center px-4">
                    <p className="text-white text-sm mb-2">Camera access required</p>
                    <p className="text-slate-300 text-xs">Please allow camera permissions to continue</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Question Card */}
          <div className="lg:col-span-2">
            <div className="bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-blue-100/70 shadow-[0_12px_30px_rgba(37,99,235,0.12)] p-5 lg:p-6 h-full">
              <div className="flex h-full flex-col gap-4">
                <div className="flex items-start space-x-3">
                <div className="shrink-0">
                  <div className="w-11 h-11 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <HiVolumeUp className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 mb-4 leading-snug max-h-40 overflow-y-auto pr-1">
                    {currentQuestion}
                  </h2>

                  {/* AI Speaking Indicator */}
                  {isAISpeaking && (
                    <div className="inline-flex items-center space-x-2 text-blue-700 mb-4 px-3 py-1.5 rounded-full bg-blue-100 border border-blue-200">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm font-semibold">AI is speaking...</span>
                    </div>
                  )}

                  {/* Replay and Mute Buttons */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={replayQuestion}
                      disabled={isAISpeaking || isSpeechMuted}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50 shadow-sm"
                    >
                      <HiVolumeUp className="w-5 h-5" />
                      <span className="text-sm font-semibold">Replay Question</span>
                    </button>
                    
                    <button
                      onClick={toggleSpeechMute}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm ${
                        isSpeechMuted 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200' 
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                      title={isSpeechMuted ? 'Unmute question audio' : 'Mute question audio'}
                    >
                      {isSpeechMuted ? (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm font-semibold">Unmute</span>
                        </>
                      ) : (
                        <>
                          <HiVolumeUp className="w-5 h-5" />
                          <span className="text-sm font-semibold">Mute</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

                <div className="bg-white/90 rounded-2xl border border-slate-200/80 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 mb-2">Recording Status</h3>
                  <div className="h-28 lg:h-32 bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-y-auto">
                    {isListening ? (
                      <div className="space-y-2">
                        <p className="text-blue-700 text-sm font-semibold">Recording live...</p>
                        <p className="text-slate-600 text-sm">Press Space to stop recording and review-ready submit.</p>
                        <p className="text-slate-500 text-xs">Transcript is hidden from the UI and logged to browser console only.</p>
                      </div>
                    ) : isTranscribing ? (
                      <div className="space-y-2">
                        <p className="text-amber-700 text-sm font-semibold">Transcribing your response...</p>
                        <p className="text-slate-600 text-sm">Please wait while we convert audio to text.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-slate-700 text-sm font-medium">Press Space to start recording your answer.</p>
                        <p className="text-slate-500 text-xs">Pauses are retained and recording continues until you press Space again.</p>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="mt-auto grid grid-cols-2 gap-3">
                  {!isListening ? (
                    <button
                      onClick={startListening}
                      disabled={isAISpeaking || isTranscribing}
                      className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_22px_rgba(37,99,235,0.35)] transform hover:scale-[1.02] transition-all"
                    >
                      <HiMicrophone className="w-5 h-5 shrink-0" />
                      <span className="font-semibold text-sm lg:text-base">Start (Space)</span>
                    </button>
                  ) : (
                    <button
                      onClick={stopListening}
                      disabled={isTranscribing}
                      className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-red-600 to-rose-600 text-white rounded-full hover:from-red-700 hover:to-rose-700 shadow-[0_10px_22px_rgba(220,38,38,0.35)] animate-pulse disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shrink-0"></div>
                      <span className="font-semibold text-sm lg:text-base">{isTranscribing ? 'Transcribing...' : 'Stop (Space)'}</span>
                    </button>
                  )}

                  <button
                    onClick={submitAnswer}
                    disabled={!currentTranscript || isListening || isAISpeaking || isTranscribing}
                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_22px_rgba(22,163,74,0.3)]"
                  >
                    <span className="font-semibold text-sm lg:text-base">Submit Answer</span>
                    <HiChevronRight className="w-5 h-5 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AIVoiceInterview
