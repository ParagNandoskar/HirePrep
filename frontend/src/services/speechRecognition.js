/**
 * Speech Recognition Service for AI Voice Interview
 * Uses browser Web Speech API for real-time voice-to-text
 */

class SpeechRecognitionService {
  constructor() {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      this.supported = false;
      return;
    }

    this.supported = true;
    this.recognition = new SpeechRecognition();
    this.isListening = false;
    this.transcript = '';
    this.finalTranscript = '';
    this.latestInterimTranscript = '';
    this.manualStop = false;
    this.shouldKeepAlive = false;
    this.restartTimeout = null;
    
    // Configure recognition
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true; // Show partial results
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    // Callbacks
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;

    // Setup event listeners
    this.setupListeners();
  }

  setupListeners() {
    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let newFinalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          newFinalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (newFinalTranscript.trim()) {
        this.finalTranscript = `${this.finalTranscript} ${newFinalTranscript.trim()}`.trim();
      }
      this.latestInterimTranscript = interimTranscript.trim();
      this.transcript = `${this.finalTranscript} ${interimTranscript}`.trim();

      if (this.onResultCallback) {
        this.onResultCallback({
          transcript: this.finalTranscript.trim(),
          fullTranscript: this.transcript,
          isFinal: newFinalTranscript.length > 0,
          interim: interimTranscript
        });
      }
    };

    this.recognition.onend = () => {
      if (this.shouldKeepAlive && !this.manualStop) {
        if (this.latestInterimTranscript) {
          this.finalTranscript = `${this.finalTranscript} ${this.latestInterimTranscript}`.trim();
          this.latestInterimTranscript = '';
        }
        this.finalTranscript = `${this.finalTranscript} [pause]`.trim();
        this.transcript = this.finalTranscript;

        if (this.onResultCallback) {
          this.onResultCallback({
            transcript: this.finalTranscript,
            fullTranscript: this.transcript,
            isFinal: true,
            interim: ''
          });
        }

        this.restartTimeout = setTimeout(() => {
          this._startRecognition(false);
        }, 200);
        return;
      }

      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      const recoverable = event.error === 'no-speech' || event.error === 'aborted';

      if (recoverable && this.shouldKeepAlive && !this.manualStop) {
        return;
      }

      this.isListening = false;
      this.shouldKeepAlive = false;
      
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onspeechend = () => {
      // Auto-stop after silence
      console.log('Speech ended');
    };
  }

  _startRecognition(resetTranscript = false) {
    if (!this.supported) return false;

    if (resetTranscript) {
      this.finalTranscript = '';
      this.transcript = '';
      this.latestInterimTranscript = '';
    }

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
      return false;
    }
  }

  start(callbacks = {}) {
    if (!this.supported) {
      console.error('Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      console.warn('Speech recognition already active, stopping previous session first');
      this.stop();
      // Wait a moment before restarting
      setTimeout(() => {
        return this.start(callbacks);
      }, 100);
      return false;
    }

    // Set callbacks
    this.onResultCallback = callbacks.onResult;
    this.onEndCallback = callbacks.onEnd;
    this.onErrorCallback = callbacks.onError;

    this.shouldKeepAlive = true;
    this.manualStop = false;

    const started = this._startRecognition(true);
    if (started) console.log('🎤 Speech recognition started');
    return started;
  }

  stop() {
    this.shouldKeepAlive = false;
    this.manualStop = true;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (!this.isListening) return this.finalTranscript.trim();

    // Preserve latest interim chunk when user manually stops before finalization.
    if (this.latestInterimTranscript) {
      this.finalTranscript = `${this.finalTranscript} ${this.latestInterimTranscript}`.trim();
      this.latestInterimTranscript = '';
      this.transcript = this.finalTranscript;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Speech recognition stopped');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      this.isListening = false;
    }

    return this.finalTranscript.trim();
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
