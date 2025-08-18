const { GoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get Gemini models
const getGeminiModel = (modelName = 'gemini-2.0-flash-exp') => {
  return genAI.getGenerativeModel({ model: modelName });
};

// Get Gemini Flash Lite for resume parsing (cost-efficient)
const getGeminiFlashLite = () => {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
};

// Get Gemini Flash for interview questions
const getGeminiFlash = () => {
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
};

// Get embeddings model for job matching
const getEmbeddingsModel = () => {
  return genAI.getGenerativeModel({ model: 'text-embedding-004' });
};

module.exports = {
  genAI,
  getGeminiModel,
  getGeminiFlashLite,
  getGeminiFlash,
  getEmbeddingsModel
};
