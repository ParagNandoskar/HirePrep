const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get Gemini models - Using Gemini 2.5 Flash (FREE, fast, latest)
const getGeminiModel = (modelName = 'models/gemini-2.5-flash') => {
  return genAI.getGenerativeModel({ model: modelName });
};

// Get Gemini Flash Lite for resume parsing (cost-efficient)
const getGeminiFlashLite = () => {
  return genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash-lite' });
};

// Get Gemini Flash for interview questions
const getGeminiFlash = () => {
  return genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });
};

// Get embeddings model for job matching
const getEmbeddingsModel = () => {
  return genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
};

module.exports = {
  genAI,
  getGeminiModel,
  getGeminiFlashLite,
  getGeminiFlash,
  getEmbeddingsModel
};
