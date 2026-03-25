const OpenAI = require('openai');

/**
 * OpenAI Client Configuration with Grok API
 * Using Grok's OpenAI-compatible API endpoint
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROK_MODEL_NAME = process.env.GROK_MODEL_NAME || 'llama-3.3-70b-versatile';

if (!OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is not set in environment variables');
}

if (!GROK_MODEL_NAME) {
  console.warn('⚠️ GROK_MODEL_NAME is not set, using default: llama-3.3-70b-versatile');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

/**
 * Get OpenAI model instance (using Grok backend)
 * @param {string} modelName - Model name (default from GROK_MODEL_NAME env variable)
 * @returns {Object} - Model object with generateContent method
 */
const getOpenAIModel = (modelName = GROK_MODEL_NAME) => {
  return {
    generateContent: async (prompt) => {
      const response = await openai.chat.completions.create({
        model: modelName,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const text = response.choices[0].message.content || '';

      return {
        response: {
          text: () => text
        }
      };
    }
  };
};

/**
 * Alternative method using direct API call
 */
const generateContent = async (prompt, options = {}) => {
  try {
    const response = await openai.chat.completions.create({
      model: options.model || GROK_MODEL_NAME,
      max_tokens: options.maxTokens || 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || 0.7
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Grok API Error:', error.message);
    throw new Error(`Grok API Error: ${error.message}`);
  }
};

/**
 * Get model for general use
 */
const getOpenAIFlashLite = () => {
  return getOpenAIModel(GROK_MODEL_NAME);
};

/**
 * Get model for interview questions
 */
const getOpenAIFlash = () => {
  return getOpenAIModel(GROK_MODEL_NAME);
};

/**
 * Get model for embeddings-like operations
 */
const getEmbeddingsModel = () => {
  return getOpenAIModel(GROK_MODEL_NAME);
};

module.exports = {
  openai,
  generateContent,
  getOpenAIModel,
  getOpenAIFlashLite,
  getOpenAIFlash,
  getEmbeddingsModel,
  GROK_MODEL_NAME
};
