/**
 * Interview Aggregation Service
 *
 * At interview completion, queries ALL per-question behavioral analysis
 * documents from MongoDB and aggregates them into final video + audio scores.
 *
 * This is the single source of truth for behavioral scoring — not in-memory state.
 * It survives backend restarts, network retries, and multi-device scenarios.
 */

const QuestionAnalysis = require('../models/QuestionAnalysis');

class InterviewAggregationService {
  /**
   * Save / upsert behavioral analysis for a single question.
   * Called after each submitAnswer.
   *
   * @param {string} sessionId
   * @param {number} questionNumber
   * @param {string} answerText
   * @param {Object|null} videoAnalysis  - result from behavioralAnalysisService.analyzeVideo()
   * @param {Object|null} audioAnalysis  - result from behavioralAnalysisService.analyzeAudioChunks()
   * @param {string|null} candidateId
   */
  async saveQuestionAnalysis(sessionId, questionNumber, questionText, answerText, videoAnalysis, audioAnalysis, candidateId = null) {
    try {
      const doc = {
        sessionId,
        questionNumber,
        questionText: questionText || '',
        answerText: answerText || '',
        candidateId: candidateId || undefined,

        // Video
        video: videoAnalysis ? {
          score:           Math.round(videoAnalysis.videoScore || 0),
          eyeContact:      Math.round(videoAnalysis.metrics?.eyeContact || 0),
          engagement:      Math.round(videoAnalysis.metrics?.engagement || 0),
          confidence:      Math.round(videoAnalysis.metrics?.confidence || 0),
          framesAnalyzed:  videoAnalysis.framesAnalyzed || 0,
          dominantEmotion: videoAnalysis.dominantEmotion || 'neutral'
        } : { score: 0, eyeContact: 0, engagement: 0, confidence: 0 },
        videoAnalyzed: !!videoAnalysis,

        // Audio
        audio: audioAnalysis ? {
          score:          Math.round(audioAnalysis.audioScore || 0),
          confidence:     Math.round(audioAnalysis.metrics?.confidence || 0),
          clarity:        Math.round(audioAnalysis.metrics?.clarity || 0),
          enthusiasm:     Math.round(audioAnalysis.metrics?.enthusiasm || 0),
          stability:      Math.round(audioAnalysis.metrics?.stability || 0),
          sentimentScore: audioAnalysis.metrics?.sentimentScore || 50,
          sentimentLabel: audioAnalysis.metrics?.sentimentLabel || 'NEUTRAL'
        } : { score: 0, confidence: 0, clarity: 0, enthusiasm: 0, stability: 0 },
        audioAnalyzed: !!audioAnalysis
      };

      // Upsert so re-submitting a question doesn't create duplicates
      await QuestionAnalysis.findOneAndUpdate(
        { sessionId, questionNumber },
        { $set: doc },
        { upsert: true, new: true }
      );

      console.log(`💾 [Aggregation] Saved Q${questionNumber} analysis — video: ${doc.video.score}, audio: ${doc.audio.score}`);
    } catch (err) {
      // Non-fatal — interview continues even if MongoDB save fails
      console.error('⚠️ [Aggregation] Failed to save question analysis:', err.message);
    }
  }

  /**
   * Aggregate all per-question results for a session into final scores.
   * Call this at completeInterview.
   *
   * @param {string} sessionId
   * @returns {{ videoScore, audioScore, questionCount, breakdown, hasCheatingIndicators }}
   */
  async aggregateFinalScores(sessionId) {
    try {
      const questions = await QuestionAnalysis.find({ sessionId }).sort({ questionNumber: 1 }).lean();

      if (!questions.length) {
        console.warn(`⚠️ [Aggregation] No questions found in MongoDB for session ${sessionId}. Using defaults.`);
        return this._defaults();
      }

      console.log(`📊 [Aggregation] Aggregating ${questions.length} questions for session ${sessionId}`);

      // Separate questions that had real analysis vs defaults
      const analyzedVideo = questions.filter(q => q.videoAnalyzed);
      const analyzedAudio = questions.filter(q => q.audioAnalyzed);

      const avg = (arr, field) =>
        arr.length ? Math.round(arr.reduce((sum, q) => sum + (q[field] || 0), 0) / arr.length) : 0;

      // Final video score — average across all questions with real video data
      const videoScore = analyzedVideo.length
        ? Math.round(
            analyzedVideo.reduce((sum, q) => {
              // Weighted: eyeContact 40%, engagement 30%, confidence 30%
              const qScore = (q.video.eyeContact * 0.4) + (q.video.engagement * 0.3) + (q.video.confidence * 0.3);
              return sum + qScore;
            }, 0) / analyzedVideo.length
          )
        : 65; // Default if no video analysis ran

      // Final audio score — average across all questions with real audio data
      const audioScore = analyzedAudio.length
        ? Math.round(
            analyzedAudio.reduce((sum, q) => {
              // Weighted: confidence 40%, clarity 30%, sentiment 20%, enthusiasm 10%
              const qScore =
                (q.audio.confidence * 0.4) +
                (q.audio.clarity * 0.3) +
                ((q.audio.sentimentScore || 50) * 0.2) +
                (q.audio.enthusiasm * 0.1);
              return sum + qScore;
            }, 0) / analyzedAudio.length
          )
        : 65;

      // Emotion distribution across all video frames
      const emotionCounts = {};
      questions.forEach(q => {
        const e = q.video.dominantEmotion || 'neutral';
        emotionCounts[e] = (emotionCounts[e] || 0) + 1;
      });

      // Per-question breakdown for detailed reporting
      const breakdown = questions.map(q => ({
        questionNumber: q.questionNumber,
        videoScore:  q.video.score,
        audioScore:  q.audio.score,
        eyeContact:  q.video.eyeContact,
        confidence:  q.video.confidence,
        sentiment:   q.audio.sentimentLabel,
        videoAnalyzed: q.videoAnalyzed,
        audioAnalyzed: q.audioAnalyzed
      }));

      const result = {
        videoScore,
        audioScore,
        questionCount:     questions.length,
        videoQuestionsAnalyzed: analyzedVideo.length,
        audioQuestionsAnalyzed: analyzedAudio.length,
        emotionDistribution: emotionCounts,
        breakdown,
        hasCheatingIndicators: false // Could be derived from eye-contact patterns
      };

      console.log(`✅ [Aggregation] Final scores — Video: ${videoScore}, Audio: ${audioScore}`);
      return result;
    } catch (err) {
      console.error('❌ [Aggregation] Error aggregating scores:', err.message);
      return this._defaults();
    }
  }

  _defaults() {
    return {
      videoScore: 65,
      audioScore: 65,
      questionCount: 0,
      videoQuestionsAnalyzed: 0,
      audioQuestionsAnalyzed: 0,
      emotionDistribution: {},
      breakdown: [],
      hasCheatingIndicators: false
    };
  }

  /**
   * Clean up all documents for a session (call after interview fully processed)
   */
  async cleanup(sessionId) {
    try {
      const result = await QuestionAnalysis.deleteMany({ sessionId });
      console.log(`🗑️ [Aggregation] Cleaned up ${result.deletedCount} docs for session ${sessionId}`);
    } catch (err) {
      console.error('⚠️ [Aggregation] Cleanup error:', err.message);
    }
  }
}

module.exports = new InterviewAggregationService();
