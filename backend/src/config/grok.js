const axios = require('axios');

/**
 * Grok AI Configuration
 * Using xAI's Grok API instead of Gemini
 */

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_BASE_URL = 'https://api.x.ai/v1';

if (!GROK_API_KEY) {
  console.warn('⚠️ GROK_API_KEY is not set in environment variables');
}

const grokClient = axios.create({
  baseURL: GROK_BASE_URL,
  headers: {
    'Authorization': `Bearer ${GROK_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Call Grok API for content generation
 * @param {string} prompt - The prompt to send to Grok
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - The response text from Grok
 */
const generateContent = async (prompt, options = {}) => {
  try {
    const response = await grokClient.post('/chat/completions', {
      model: options.model || 'grok-2',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: false
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Grok API Error:', error.response?.data || error.message);
    throw new Error(`Grok API Error: ${error.message}`);
  }
};

/**
 * Get Grok model instance (compatible interface)
 * @param {string} modelName - Model name (ignored, uses grok-2 by default)
 * @returns {Object} - Model object with generateContent method
 */
const getGrokModel = (modelName = 'grok-2') => {
  return {
    generateContent: async (prompt) => {
      const text = await generateContent(prompt, { model: modelName });
      return {
        response: {
          text: () => text
        }
      };
    }
  };
};

/**
 * Get Grok for general use
 */
const getGrokFlashLite = () => {
  return getGrokModel('grok-2');
};

/**
 * Get Grok for interview questions
 */
const getGrokFlash = () => {
  return getGrokModel('grok-2');
};

/**
 * Simplified embeddings-like function for Grok
 * Note: Grok doesn't have native embeddings, this uses text similarity
 */
const getEmbeddingsModel = () => {
  return getGrokModel('grok-2');
};

module.exports = {
  grokClient,
  generateContent,
  getGrokModel,
  getGrokFlashLite,
  getGrokFlash,
  getEmbeddingsModel
};
