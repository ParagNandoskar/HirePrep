// Browser-based Text-to-Speech service (no Google Cloud billing required)
// This service returns text only - TTS is handled by browser's Web Speech API

class GoogleTTSService {
  constructor() {
    // No client initialization needed - using browser TTS
    console.log('✅ Using browser-based Text-to-Speech (FREE, no API required)');
  }

  /**
   * Return text for browser to speak using Web Speech API
   * @param {string} text - Text to convert to speech
   * @param {string} languageCode - Language code (default: 'en-US')
   * @param {string} voiceName - Voice name (for compatibility, not used)
   * @returns {Promise<Buffer>} Empty buffer (browser handles TTS)
   */
  async textToSpeech(text, languageCode = 'en-US', voiceName = 'en-US-Neural2-F') {
    try {
      // Return text as JSON instead of audio buffer
      // Frontend will use browser's speechSynthesis API
      return Buffer.from(JSON.stringify({ 
        text, 
        languageCode,
        voiceName,
        useBrowserTTS: true 
      }));
    } catch (error) {
      console.error('Error in TTS service:', error);
      throw error;
    }
  }

  /**
   * Get available voices (for reference)
   */
  getAvailableVoices() {
    return {
      professional: {
        female: ['Google UK English Female', 'Microsoft Zira', 'Google US English'],
        male: ['Google UK English Male', 'Microsoft David']
      },
      casual: {
        female: ['Google US English Female'],
        male: ['Google US English Male']
      }
    };
  }
}

module.exports = new GoogleTTSService();

