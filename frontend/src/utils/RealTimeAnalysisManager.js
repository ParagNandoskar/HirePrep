/**
 * Real-Time Analysis Manager
 * 
 * Manages parallel streaming of video frames, audio chunks, and interview responses
 * to all analysis services simultaneously during an interview.
 * 
 * ARCHITECTURE:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    Interview In Progress                     │
 * └──────────────────┬──────────────┬──────────────┬────────────┘
 *                    │              │              │
 *         ┌──────────▼────────┐  ┌──▼─────────┐  ┌▼──────────────┐
 *         │  Video Frames     │  │   Audio     │  │   Answers     │
 *         │  (30fps → 1fps)   │  │  Chunks     │  │  (Transcript) │
 *         └──────────┬────────┘  └──┬─────────┘  └┬──────────────┘
 *                    │              │              │
 *         ┌──────────▼────────┐  ┌──▼─────────┐  ┌▼──────────────┐
 *         │ Video Service     │  │  Audio     │  │   Backend AI  │
 *         │ (Python:8001)     │  │ Service    │  │  (Gemini)     │
 *         │                   │  │(Python:8002)  │               │
 *         └──────────┬────────┘  └──┬─────────┘  └┬──────────────┘
 *                    │              │              │
 *         ┌──────────▼──────────────▼──────────────▼──────────────┐
 *         │         Backend Aggregation Service                   │
 *         │  Final Score = Video(30%) + Audio(30%) + Content(40%) │
 *         └───────────────────────────────────────────────────────┘
 */

import { API_BASE_PATH_URL } from '../services/apiConfig';

class RealTimeAnalysisManager {
  constructor(interviewId, API_URL = API_BASE_PATH_URL) {
    if (!API_URL) {
      throw new Error('Missing VITE_API_URL (or VITE_API_BASE_URL) in production environment');
    }

    this.interviewId = interviewId;
    this.apiUrl = API_URL;
    
    // Analysis states
    this.videoAnalysisState = {
      framesAnalyzed: 0,
      currentScore: 0,
      status: 'idle'
    };
    
    this.audioAnalysisState = {
      chunksAnalyzed: 0,
      currentScore: 0,
      status: 'idle'
    };
    
    this.contentAnalysisState = {
      answersEvaluated: 0,
      currentScore: 0,
      status: 'idle'
    };
    
    // Frame capture settings
    this.frameCaptureInterval = 1000; // 1 frame per second
    this.lastFrameTime = 0;
    this.capturedFrames = [];
    
    // Audio capture settings
    this.audioChunkInterval = 5000; // 5 seconds per chunk
    this.audioChunks = [];
    this.audioContext = null;
    this.audioRecorder = null;
    
    // Debug logging
    this.debugMode = true;
    
    console.log('🎬 RealTimeAnalysisManager initialized', {
      interviewId,
      apiUrl: this.apiUrl,
      frameInterval: this.frameCaptureInterval,
      audioInterval: this.audioChunkInterval
    });
  }
  
  /**
   * Start real-time analysis (video + audio + content)
   */
  async startAnalysis(videoElement, audioStream) {
    console.log('\n🚀 Starting parallel real-time analysis...');
    console.log('='.repeat(60));
    
    try {
      // Start video frame capture
      this.startVideoAnalysis(videoElement);
      
      // Start audio chunk analysis
      this.startAudioAnalysis(audioStream);
      
      console.log('✅ All services started successfully');
      console.log('='.repeat(60) + '\n');
      
      return {
        success: true,
        message: 'Real-time analysis started'
      };
    } catch (error) {
      console.error('❌ Failed to start analysis:', error);
      throw error;
    }
  }
  
  /**
   * Start video frame capture and analysis
   */
  startVideoAnalysis(videoElement) {
    console.log('📹 Starting video frame capture...');
    this.videoAnalysisState.status = 'running';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    this.videoInterval = setInterval(() => {
      this.captureAndSendFrame(videoElement, canvas, ctx);
    }, this.frameCaptureInterval);
    
    console.log(`   Capturing 1 frame every ${this.frameCaptureInterval}ms`);
  }
  
  /**
   * Capture and send a single video frame
   */
  async captureAndSendFrame(videoElement, canvas, ctx) {
    try {
      // Capture frame
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const frameBase64 = frameDataUrl.split(',')[1];
      
      this.capturedFrames.push(frameBase64);
      
      // Send to video service every 5 frames (5 seconds worth)
      if (this.capturedFrames.length >= 5) {
        const framesToSend = [...this.capturedFrames];
        this.capturedFrames = [];
        
        console.log(`📤 Sending ${framesToSend.length} frames to video service...`);
        
        // Send to Python video service
        const response = await fetch(`${this.apiUrl}/analysis/video-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId: this.interviewId,
            videoData: framesToSend
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          this.videoAnalysisState.framesAnalyzed += framesToSend.length;
          this.videoAnalysisState.currentScore = result.overallVideoScore || 0;
          
          console.log(`✅ Video analysis: ${this.videoAnalysisState.framesAnalyzed} frames, score: ${this.videoAnalysisState.currentScore.toFixed(1)}/100`);
        } else {
          console.error(`❌ Video service error: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('❌ Frame capture error:', error);
    }
  }
  
  /**
   * Start audio chunk capture and analysis
   */
  async startAudioAnalysis(audioStream) {
    console.log('🎤 Starting audio chunk capture...');
    this.audioAnalysisState.status = 'running';
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(audioStream);
      
      // Create audio recorder
      this.audioRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      let currentChunk = [];
      
      this.audioRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentChunk.push(event.data);
        }
      };
      
      this.audioRecorder.onstop = async () => {
        if (currentChunk.length > 0) {
          await this.sendAudioChunk(currentChunk);
          currentChunk = [];
        }
      };
      
      // Record and send chunks every 5 seconds
      this.audioInterval = setInterval(() => {
        if (this.audioRecorder.state === 'recording') {
          this.audioRecorder.stop();
        }
        
        setTimeout(() => {
          if (this.audioAnalysisState.status === 'running') {
            this.audioRecorder.start();
          }
        }, 100);
      }, this.audioChunkInterval);
      
      this.audioRecorder.start();
      console.log(`   Recording ${this.audioChunkInterval / 1000}s audio chunks`);
    } catch (error) {
      console.error('❌ Audio analysis start error:', error);
    }
  }
  
  /**
   * Send audio chunk to analysis service
   */
  async sendAudioChunk(chunkBlobs) {
    try {
      console.log(`📤 Sending audio chunk to audio service...`);
      
      const audioBlob = new Blob(chunkBlobs, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const response = await fetch(`${this.apiUrl}/analysis/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: this.interviewId,
          audio_base64: base64
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.audioAnalysisState.chunksAnalyzed++;
        this.audioAnalysisState.currentScore = result.overall_score || 0;
        
        console.log(`✅ Audio analysis: ${this.audioAnalysisState.chunksAnalyzed} chunks, score: ${this.audioAnalysisState.currentScore.toFixed(1)}/100`);
      } else {
        console.error(`❌ Audio service error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Audio chunk send error:', error);
    }
  }
  
  /**
   * Send interview answer for content analysis
   */
  async analyzeAnswer(questionId, answer, transcript) {
    console.log(`\n💬 Analyzing answer for question ${questionId}...`);
    
    try {
      const response = await fetch(`${this.apiUrl}/analysis/interview-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: this.interviewId,
          questionId,
          answer,
          transcript
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        this.contentAnalysisState.answersEvaluated++;
        this.contentAnalysisState.currentScore = result.contentScore || 0;
        
        console.log(`✅ Content analysis: ${this.contentAnalysisState.answersEvaluated} answers, score: ${this.contentAnalysisState.currentScore.toFixed(1)}/100\n`);
        
        return result;
      } else {
        console.error(`❌ Content analysis error: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Answer analysis error:', error);
      return null;
    }
  }
  
  /**
   * Stop all analysis and get final aggregated score
   */
  async finalizeInterview() {
    console.log('\n🏁 Finalizing interview analysis...');
    console.log('='.repeat(60));
    
    try {
      // Stop video capture
      if (this.videoInterval) {
        clearInterval(this.videoInterval);
        this.videoAnalysisState.status = 'stopped';
      }
      
      // Stop audio capture
      if (this.audioInterval) {
        clearInterval(this.audioInterval);
      }
      if (this.audioRecorder && this.audioRecorder.state === 'recording') {
        this.audioRecorder.stop();
      }
      if (this.audioContext) {
        await this.audioContext.close();
      }
      this.audioAnalysisState.status = 'stopped';
      
      // Send remaining frames if any
      if (this.capturedFrames.length > 0) {
        console.log(`📤 Sending final ${this.capturedFrames.length} frames...`);
        await fetch(`${this.apiUrl}/analysis/video-frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId: this.interviewId,
            videoData: this.capturedFrames
          })
        });
      }
      
      // Get final aggregated score from backend
      console.log('📊 Requesting final aggregated score...');
      const response = await fetch(`${this.apiUrl}/analysis/finalize-interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: this.interviewId
        })
      });
      
      if (response.ok) {
        const finalResult = await response.json();
        
        console.log('\n📊 FINAL RESULTS:');
        console.log('='.repeat(60));
        console.log(`   Video Score:   ${finalResult.videoScore?.toFixed(1) || 0}/100 (30%)`);
        console.log(`   Audio Score:   ${finalResult.audioScore?.toFixed(1) || 0}/100 (30%)`);
        console.log(`   Content Score: ${finalResult.contentScore?.toFixed(1) || 0}/100 (40%)`);
        console.log('─'.repeat(60));
        console.log(`   FINAL SCORE:   ${finalResult.finalScore?.toFixed(1) || 0}/100`);
        console.log('='.repeat(60) + '\n');
        
        return finalResult;
      } else {
        console.error(`❌ Finalization error: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Finalization error:', error);
      throw error;
    }
  }
  
  /**
   * Get current analysis progress
   */
  getProgress() {
    return {
      video: this.videoAnalysisState,
      audio: this.audioAnalysisState,
      content: this.contentAnalysisState
    };
  }
  
  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
  }
}

export default RealTimeAnalysisManager;
