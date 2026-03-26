/**
 * Speech Recognition Service for AI Voice Interview
 * Uses MediaRecorder + Groq/OpenAI-compatible transcription API
 */

class SpeechRecognitionService {
  constructor() {
    this.supported =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined';

    this.isListening = false;
    this.transcript = '';
    this.finalTranscript = '';

    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;

    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.recordingMimeType = 'audio/webm';
    this.stopResolver = null;
  }

  getConfig() {
    return {
      apiKey: (import.meta.env.VITE_XAI_API_KEY ?? '').trim(),
      modelName: (import.meta.env.VITE_XAI_MODEL ?? 'whisper-large-v3-turbo').trim(),
      transcriptionUrl: (
        import.meta.env.VITE_TRANSCRIPTION_API_URL ??
        'https://api.groq.com/openai/v1/audio/transcriptions'
      ).trim()
    };
  }

  getPreferredMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    const supportedType = candidates.find((mime) => {
      if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return false;
      return MediaRecorder.isTypeSupported(mime);
    });

    return supportedType || 'audio/webm';
  }

  mapMediaError(error) {
    if (!error) return 'unknown';
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'not-allowed';
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') return 'no-microphone';
    return 'unknown';
  }

  async transcribeAudio(audioBlob) {
    const { apiKey, modelName, transcriptionUrl } = this.getConfig();

    if (!apiKey || !modelName || !transcriptionUrl) {
      throw new Error('missing-api-config');
    }

    const file = new File([audioBlob], 'answer.webm', { type: audioBlob.type || 'audio/webm' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', modelName);

    const response = await fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`api-error:${response.status}:${details}`);
    }

    const data = await response.json();
    return (data?.text || '').trim();
  }

  async start(callbacks = {}) {
    if (!this.supported) {
      console.error('Audio capture is not supported in this browser');
      return false;
    }

    if (this.isListening) {
      console.warn('Speech recognition already active');
      return false;
    }

    this.onResultCallback = callbacks.onResult;
    this.onEndCallback = callbacks.onEnd;
    this.onErrorCallback = callbacks.onError;

    this.transcript = '';
    this.finalTranscript = '';
    this.audioChunks = [];

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordingMimeType = this.getPreferredMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: this.recordingMimeType });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: this.recordingMimeType || 'audio/webm' });
          const transcriptionText = await this.transcribeAudio(audioBlob);

          this.finalTranscript = transcriptionText;
          this.transcript = transcriptionText;

          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: transcriptionText,
              fullTranscript: transcriptionText,
              isFinal: true,
              interim: ''
            });
          }
        } catch (error) {
          const reason = error?.message || 'transcription-failed';
          if (this.onErrorCallback) {
            this.onErrorCallback(reason);
          }
        } finally {
          this.isListening = false;
          this.mediaStream?.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
          this.mediaRecorder = null;
          this.audioChunks = [];

          if (this.onEndCallback) {
            this.onEndCallback();
          }

          if (this.stopResolver) {
            this.stopResolver(this.finalTranscript.trim());
            this.stopResolver = null;
          }
        }
      };

      this.mediaRecorder.start(250);
      this.isListening = true;
      return true;
    } catch (error) {
      this.isListening = false;
      this.mediaStream?.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
      this.mediaRecorder = null;

      if (this.onErrorCallback) {
        this.onErrorCallback(this.mapMediaError(error));
      }

      return false;
    }
  }

  stop() {
    if (!this.isListening || !this.mediaRecorder) {
      return Promise.resolve(this.finalTranscript.trim());
    }

    return new Promise((resolve) => {
      this.stopResolver = resolve;

      try {
        if (this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        } else {
          this.isListening = false;
          this.mediaStream?.getTracks().forEach((track) => track.stop());
          this.mediaStream = null;
          this.mediaRecorder = null;
          resolve(this.finalTranscript.trim());
        }
      } catch (error) {
        console.error('Failed to stop recording:', error);
        this.isListening = false;
        this.mediaStream?.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
        this.mediaRecorder = null;
        resolve(this.finalTranscript.trim());
      }
    });
  }

  getTranscript() {
    return this.transcript;
  }

  isSupported() {
    return this.supported;
  }

  isActive() {
    return this.isListening;
  }
}

// Text-to-Speech Service using browser API
export class TextToSpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.synth) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice
      utterance.rate = options.rate || 0.9; // Slightly slower for clarity
      utterance.pitch = options.pitch || 1;
      utterance.volume = options.volume || 1;
      utterance.lang = options.lang || 'en-US';

      // Select voice (prefer female, neural if available)
      const voices = this.synth.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Google') || v.name.includes('Microsoft'))
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        console.log('🔊 AI speaking:', text.substring(0, 50) + '...');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        console.log('✅ Speech finished');
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        console.error('Speech error:', event);
        reject(event);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    });
  }

  stop() {
    if (this.synth && this.isSpeaking) {
      this.synth.cancel();
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  pause() {
    if (this.synth && this.isSpeaking) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  getVoices() {
    return this.synth ? this.synth.getVoices() : [];
  }

  isActive() {
    return this.isSpeaking;
  }
}

// Export singleton instances
export const speechRecognition = new SpeechRecognitionService();
export const textToSpeech = new TextToSpeechService();

// Helper function to wait for voices to load
export const waitForVoices = () => {
  return new Promise(resolve => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    
    if (voices.length > 0) {
      resolve(voices);
    } else {
      synth.onvoiceschanged = () => {
        resolve(synth.getVoices());
      };
    }
  });
};

export default {
  speechRecognition,
  textToSpeech,
  waitForVoices
};
