import { apiService } from './api';

class GeminiVoiceService {
  /**
   * Initialize a new AI voice interview session
   */
  async initializeInterview(jobId, applicationId, candidateName, mockJobDetails = null) {
    try {
      const response = await apiService.post('/gemini-voice/initialize', {
        jobId,
        applicationId,
        candidateName,
        mockJobDetails
      });
      return response;
    } catch (error) {
      console.error('Error initializing interview:', error);
      throw error;
    }
  }

  /**
   * Get next AI-generated question
   */
  async getNextQuestion(sessionId) {
    try {
      const response = await apiService.post('/gemini-voice/next-question', {
        sessionId
      });
      return response;
    } catch (error) {
      console.error('Error getting next question:', error);
      throw error;
    }
  }

  /**
   * Play question audio using browser's built-in Speech Synthesis (FREE, no API needed)
   */
  async playQuestionAudio(questionText, voiceType = 'professional_female') {
    try {
      return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
          reject(new Error('Speech synthesis not supported in this browser'));
          return;
        }

        // Wait a moment before speaking to avoid interruption
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(questionText);
          
          // Configure voice settings
          utterance.rate = 0.9; // Slightly slower for clarity
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          utterance.lang = 'en-US';

          // Select appropriate voice
          const voices = window.speechSynthesis.getVoices();
          const preferredVoices = [
            'Google US English Female',
            'Microsoft Zira',
            'Google UK English Female',
            'Samantha',
            'Victoria'
          ];

          const selectedVoice = voices.find(voice => 
            preferredVoices.some(pv => voice.name.includes(pv))
          ) || voices.find(voice => voice.lang === 'en-US') || voices[0];

          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }

          utterance.onend = () => {
            resolve();
          };

          utterance.onerror = (error) => {
            // Only log real errors, not interruptions from user navigation
            if (error.error !== 'interrupted') {
              console.error('Speech synthesis error:', error);
            }
            resolve(); // Resolve anyway to not block UI
          };

          window.speechSynthesis.speak(utterance);
        }, 100); // Small delay to prevent interruption
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Submit candidate's answer with behavioral analysis data
   */
  async submitAnswer(sessionId, answerText, questionText = '', videoFrames = [], audioChunks = [], questionNumber = 0, candidateId = null) {
    try {
      const payload = {
        sessionId,
        answerText,
        questionText
      };

      // Add behavioral data if available
      if (videoFrames.length > 0 || audioChunks.length > 0) {
        payload.videoFrames = videoFrames;
        payload.audioChunks = audioChunks;
        payload.questionNumber = questionNumber;
        
        if (candidateId) {
          payload.candidateId = candidateId;
        }

        console.log(`📤 Sending ${videoFrames.length} frames and ${audioChunks.length} audio chunks for behavioral analysis`);
      }

      const response = await apiService.post('/gemini-voice/submit-answer', payload);
      return response;
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }

  /**
   * Complete interview and get analysis
   */
  async completeInterview(sessionId, applicationId, proctoringStats = null) {
    try {
      const payload = {
        sessionId,
        applicationId
      };

      if (proctoringStats) {
        payload.proctoringStats = proctoringStats;
      }

      const response = await apiService.post('/gemini-voice/complete', payload);
      return response;
    } catch (error) {
      console.error('Error completing interview:', error);
      throw error;
    }
  }

  /**
   * Get interview progress
   */
  async getProgress(sessionId) {
    try {
      const response = await apiService.get(`/gemini-voice/progress/${sessionId}`);
      return response;
    } catch (error) {
      console.error('Error getting progress:', error);
      throw error;
    }
  }

  async getMockResults() {
    try {
      const response = await apiService.get('/gemini-voice/mock-results');
      return response;
    } catch (error) {
      console.error('Error getting mock results:', error);
      throw error;
    }
  }

  async getMockResultById(mockInterviewId) {
    try {
      const response = await apiService.get(`/gemini-voice/mock-results/${mockInterviewId}`);
      return response;
    } catch (error) {
      console.error('Error getting mock result by id:', error);
      throw error;
    }
  }
}

export default new GeminiVoiceService();
