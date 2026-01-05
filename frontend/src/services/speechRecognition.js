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
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      this.transcript = finalTranscript + interimTranscript;

      if (this.onResultCallback) {
        this.onResultCallback({
          transcript: this.transcript,
          isFinal: finalTranscript.length > 0,
          interim: interimTranscript
        });
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.onEndCallback) {
        this.onEndCallback();
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onspeechend = () => {
      // Auto-stop after silence
      console.log('Speech ended');
    };
  }

  start(callbacks = {}) {
    if (!this.supported) {
      console.error('Speech recognition not supported');
      return false;
    }

    if (this.isListening) {
      console.warn('Already listening');
      return false;
    }

    // Set callbacks
    this.onResultCallback = callbacks.onResult;
    this.onEndCallback = callbacks.onEnd;
    this.onErrorCallback = callbacks.onError;

    // Reset transcript
    this.transcript = '';

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('🎤 Speech recognition started');
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      return false;
    }
  }

  stop() {
    if (!this.isListening) {
      return this.transcript;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('🎤 Speech recognition stopped');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
    }

    return this.transcript;
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
