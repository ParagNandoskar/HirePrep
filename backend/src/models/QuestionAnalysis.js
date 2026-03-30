const mongoose = require('mongoose');

/**
 * QuestionAnalysis Model
 *
 * Stores per-question video + audio behavioral analysis during an interview.
 * Persists to MongoDB so final scoring can aggregate across ALL questions
 * even if the session is lost (backend restart, etc.).
 *
 * Final Score = 40% Gemini content + 30% video (avg this) + 30% audio (avg this)
 */
const questionAnalysisSchema = new mongoose.Schema({
  // Session / identity
  sessionId:      { type: String, required: true, index: true },
  candidateId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  questionNumber: { type: Number, required: true },
  questionText:   { type: String, required: false }, // The AI question that was asked
  answerText:     { type: String, required: false },

  // ---- Video Analysis (from Python video service port 8001) ----
  video: {
    score:           { type: Number, default: 0 },  // 0-100
    eyeContact:      { type: Number, default: 0 },
    engagement:      { type: Number, default: 0 },
    confidence:      { type: Number, default: 0 },
    framesAnalyzed:  { type: Number, default: 0 },
    dominantEmotion: { type: String, default: 'neutral' }
  },

  // ---- Audio Analysis (from Python audio service port 8002) ----
  audio: {
    score:          { type: Number, default: 0 }, // 0-100
    confidence:     { type: Number, default: 0 },
    clarity:        { type: Number, default: 0 },
    enthusiasm:     { type: Number, default: 0 },
    stability:      { type: Number, default: 0 },
    sentimentScore: { type: Number, default: 50 },
    sentimentLabel: { type: String, default: 'NEUTRAL' }
  },

  // Was analysis actually performed or did we fall back to defaults?
  videoAnalyzed: { type: Boolean, default: false },
  audioAnalyzed: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

questionAnalysisSchema.index({ sessionId: 1, questionNumber: 1 }, { unique: true });

module.exports = mongoose.model('QuestionAnalysis', questionAnalysisSchema);
