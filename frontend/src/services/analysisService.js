import { apiService } from './api'

/**
 * Analysis Service
 * Handles video and audio analysis during interviews
 */
export const analysisService = {
  /**
   * Analyze a single video frame
   * @param {Object} data - { interviewId, questionId, frameBase64 }
   * @returns {Promise} Video analysis results
   */
  analyzeVideoFrame: (data) => {
    return apiService.post('/analysis/video-frame', data)
  },

  /**
   * Analyze audio recording
   * @param {Object} data - { audioBase64, transcript }
   * @returns {Promise} Audio analysis results
   */
  analyzeAudio: (data) => {
    return apiService.post('/analysis/audio', data)
  },

  /**
   * Process complete interview answer (video + audio + transcript)
   * @param {Object} data - {
   *   interviewId,
   *   questionId,
   *   videoBase64,
   *   audioBase64,
   *   transcript,
   *   question,
   *   answer
   * }
   * @returns {Promise} Combined analysis results
   */
  processInterviewAnswer: (data) => {
    return apiService.post('/analysis/interview-answer', data)
  },

  /**
   * Finalize interview and update leaderboard
   * @param {string} interviewId - Interview ID
   * @returns {Promise} Final scores and rankings
   */
  finalizeInterview: (interviewId) => {
    return apiService.post(`/analysis/finalize-interview/${interviewId}`)
  },

  /**
   * Get leaderboard for a specific job
   * @param {string} jobId - Job ID
   * @returns {Promise} Leaderboard data with rankings
   */
  getJobLeaderboard: (jobId) => {
    return apiService.get(`/analysis/leaderboard/${jobId}`)
  },

  /**
   * Get current user's rank in a job
   * @param {string} jobId - Job ID
   * @returns {Promise} Rank data
   */
  getMyRank: (jobId) => {
    return apiService.get(`/analysis/my-rank/${jobId}`)
  },

  /**
   * Check if analysis services are available
   * @returns {Promise} Health status of video/audio services
   */
  checkHealth: () => {
    return apiService.get('/analysis/health')
  }
}

/**
 * Helper functions for media processing
 */
export const mediaHelpers = {
  /**
   * Convert Blob to Base64
   * @param {Blob} blob - Media blob
   * @returns {Promise<string>} Base64 string
   */
  blobToBase64: (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1] // Remove data:*/*;base64, prefix
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  },

  /**
   * Capture video frame from video element
   * @param {HTMLVideoElement} videoElement - Video element
   * @param {number} quality - JPEG quality (0-1), default 0.8
   * @returns {Promise<string>} Base64 frame image
   */
  captureVideoFrame: async (videoElement, quality = 0.8) => {
    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth || 640
    canvas.height = videoElement.videoHeight || 480

    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          const base64 = await mediaHelpers.blobToBase64(blob)
          resolve(base64)
        },
        'image/jpeg',
        quality
      )
    })
  },

  /**
   * Record audio from MediaStream
   * @param {MediaStream} stream - Media stream with audio
   * @param {number} maxDuration - Max recording duration in ms (default 5min)
   * @returns {Object} { start, stop, getBlob }
   */
  createAudioRecorder: (stream, maxDuration = 300000) => {
    let mediaRecorder
    let audioChunks = []
    let startTime

    return {
      start: () => {
        audioChunks = []
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        mediaRecorder.start(1000) // Collect data every second
        startTime = Date.now()

        // Auto-stop after max duration
        setTimeout(() => {
          if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
        }, maxDuration)
      },

      stop: () => {
        return new Promise((resolve) => {
          if (!mediaRecorder) {
            resolve(null)
            return
          }

          mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
            const duration = (Date.now() - startTime) / 1000
            resolve({ blob: audioBlob, duration })
          }

          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          } else {
            resolve(null)
          }
        })
      },

      getState: () => mediaRecorder?.state || 'inactive'
    }
  },

  /**
   * Convert audio blob to appropriate format for analysis
   * @param {Blob} blob - Audio blob
   * @returns {Promise<string>} Base64 audio
   */
  prepareAudioForAnalysis: async (blob) => {
    // Convert to base64
    const base64 = await mediaHelpers.blobToBase64(blob)
    return base64
  }
}

/**
 * Interview Recording Manager
 * Manages video/audio recording and real-time analysis
 */
export class InterviewRecordingManager {
  constructor(interviewId, videoElement) {
    this.interviewId = interviewId
    this.videoElement = videoElement
    this.stream = null
    this.audioRecorder = null
    this.frameAnalysisInterval = null
    this.currentQuestionId = null
  }

  /**
   * Start recording (video + audio)
   * @returns {Promise<void>}
   */
  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream
        await this.videoElement.play()
      }

      // Initialize audio recorder
      this.audioRecorder = mediaHelpers.createAudioRecorder(this.stream)

      console.log('✅ Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw new Error('Camera/microphone access denied')
    }
  }

  /**
   * Start recording answer for a specific question
   * @param {number} questionId - Question number
   */
  startAnswerRecording(questionId) {
    this.currentQuestionId = questionId
    
    // Start audio recording
    if (this.audioRecorder) {
      this.audioRecorder.start()
    }

    // Start periodic frame analysis (every 2 seconds)
    this.frameAnalysisInterval = setInterval(async () => {
      try {
        if (this.videoElement && this.currentQuestionId !== null) {
          const frameBase64 = await mediaHelpers.captureVideoFrame(this.videoElement, 0.7)
          
          // Send to analysis (fire and forget - don't block)
          analysisService.analyzeVideoFrame({
            interviewId: this.interviewId,
            questionId: this.currentQuestionId,
            frameBase64
          }).catch(err => console.warn('Frame analysis warning:', err.message))
        }
      } catch (error) {
        console.warn('Frame capture error:', error)
      }
    }, 2000) // Every 2 seconds
  }

  /**
   * Stop recording answer and get audio data
   * @returns {Promise<Object>} { audioBlob, duration }
   */
  async stopAnswerRecording() {
    // Stop frame analysis
    if (this.frameAnalysisInterval) {
      clearInterval(this.frameAnalysisInterval)
      this.frameAnalysisInterval = null
    }

    // Stop audio recording
    let audioData = null
    if (this.audioRecorder) {
      audioData = await this.audioRecorder.stop()
    }

    this.currentQuestionId = null

    return audioData
  }

  /**
   * Stop all recording and release resources
   */
  stopRecording() {
    // Stop answer recording if active
    if (this.frameAnalysisInterval) {
      clearInterval(this.frameAnalysisInterval)
    }

    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null
    }

    console.log('🛑 Recording stopped')
  }

  /**
   * Get current stream
   * @returns {MediaStream}
   */
  getStream() {
    return this.stream
  }

  /**
   * Check if currently recording an answer
   * @returns {boolean}
   */
  isRecordingAnswer() {
    return this.frameAnalysisInterval !== null
  }
}

export default analysisService
