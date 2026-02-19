const axios = require('axios');

// Python microservices URLs
const VIDEO_ANALYSIS_URL = process.env.VIDEO_ANALYSIS_URL || 'http://localhost:8001';
const AUDIO_ANALYSIS_URL = process.env.AUDIO_ANALYSIS_URL || 'http://localhost:8002';

class BehavioralAnalysisService {
    /**
     * Analyze video frames for behavioral metrics
     * @param {Array<string>} videoFrames - Array of base64 encoded video frames
     * @param {string} interviewId - Interview session ID
     * @returns {Promise<Object>} - Video analysis results
     */
    async analyzeVideo(videoFrames, interviewId) {
        try {
            console.log(`📹 Analyzing ${videoFrames.length} video frames for interview ${interviewId}...`);

            const response = await axios.post(`${VIDEO_ANALYSIS_URL}/analyze-video`, {
                videoData: videoFrames,
                interviewId: interviewId
            }, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const analysis = response.data;

            // Use the score directly from the Python service (DeepFace + MediaPipe)
            const videoScore = analysis.overallVideoScore || 0;

            return {
                rawAnalysis: analysis,
                videoScore: videoScore,
                metrics: {
                    eyeContact: analysis.eyeContactScore || 0,
                    engagement: analysis.engagementScore || 0,
                    confidence: analysis.confidenceScore || 0,
                    attentiveness: analysis.eyeContactScore || 0, // Reuse eye contact for now
                    lookingAway: 100 - (analysis.eyeContactScore || 100), // Infer from eye contact
                    multiplePersons: false // Not implemented
                },
                cheatingIndicators: {
                    multiplePersons: false,
                    frequentLookAway: (analysis.eyeContactScore || 100) < 50,
                    noFaceDetected: (analysis.analysisMetadata?.framesAnalyzed || 0) === 0
                }
            };
        } catch (error) {
            console.error('❌ Video analysis error:', error.message);
            // Return default scores if Python service fails
            return this._getDefaultVideoAnalysis();
        }
    }

    /**
     * Analyze audio chunks for tone, stress, and sentiment
     * @param {Buffer} audioBuffer - Buffer containing audio data
     * @param {string} interviewId - Interview session ID
     * @param {string} answerText - The transcribed text of the audio
     * @returns {Promise<Object>} - Audio analysis results
     */
    async analyzeAudio(audioBuffer, interviewId, answerText) {
        try {
            if (!audioBuffer) {
                throw new Error('No audio buffer provided');
            }

            // Audio buffer is likely the raw file buffer or JSON from frontend
            // The frontend sends formData with 'audio' file usually, or json with base64.
            // Let's assume we read the raw bytes and base64 encode them for the Python service.

            const audioBase64 = audioBuffer.toString('base64');

            const response = await axios.post(`${this.audioServiceUrl}/analyze-audio`, {
                interviewId,
                audioData: [audioBase64],
                transcript: answerText || "" // Pass transcript for VADER/DistilBERT
            });

            console.log('🎤 Audio Analysis ML Result:', JSON.stringify(response.data, null, 2));
            const analysis = response.data;

            // Map Python ML output to internal metrics
            // Python: { prosody: { stability, energy, clarity }, text_analysis: { label, sentiment_score }, confidence_score }

            const metrics = {
                confidence: analysis.confidence_score || 0,
                clarity: analysis.prosody?.clarity || 0,
                enthusiasm: analysis.prosody?.energy || 0,
                stability: analysis.prosody?.stability || 0,
                sentimentScore: analysis.text_analysis?.sentiment_score || 50,
                sentimentLabel: analysis.text_analysis?.label || 'NEUTRAL'
            };

            return {
                rawAnalysis: analysis,
                audioScore: Math.round(metrics.confidence), // Use the hybrid confidence directly
                metrics: metrics
            };
        } catch (error) {
            console.error('❌ Audio analysis error:', error.message);
            // Return default scores if Python service fails
            return this._getDefaultAudioAnalysis();
        }
    }

    /**
     * Combine video and audio analysis into comprehensive behavioral score
     * @param {Object} videoAnalysis - Video analysis results
     * @param {Object} audioAnalysis - Audio analysis results
     * @returns {Object} - Combined behavioral analysis
     */
    combineBehavioralAnalysis(videoAnalysis, audioAnalysis) {
        // Weighted combination: 40% video, 40% audio, 20% content (handled elsewhere, so here just 50/50 of what we have)
        // actually, let's keep it 50/50 for the behavioral part.

        const videoScore = videoAnalysis ? videoAnalysis.videoScore : 0;
        const audioScore = audioAnalysis ? audioAnalysis.audioScore : 0;

        // If one is missing, use the other. If both, average.
        let combinedScore = 0;
        if (videoAnalysis && audioAnalysis) {
            combinedScore = (videoScore * 0.5) + (audioScore * 0.5);
        } else if (videoAnalysis) {
            combinedScore = videoScore;
        } else if (audioAnalysis) {
            combinedScore = audioScore;
        }

        return {
            overallBehavioralScore: Math.round(combinedScore),
            videoScore: Math.round(videoScore),
            audioScore: Math.round(audioScore),
            detailedMetrics: {
                video: videoAnalysis ? videoAnalysis.metrics : {},
                audio: audioAnalysis ? audioAnalysis.metrics : {}
            },
            rawAnalysis: {
                video: videoAnalysis ? videoAnalysis.rawAnalysis : null,
                audio: audioAnalysis ? audioAnalysis.rawAnalysis : null
            },
            recommendations: this._generateRecommendations(videoAnalysis, audioAnalysis)
        };
    }

    /**
     * Calculate video behavioral score (0-100)
     * @private
     */
    _calculateVideoScore(analysis) {
        const weights = {
            eyeContact: 0.3,
            engagement: 0.25,
            confidence: 0.25,
            attentiveness: 0.2
        };

        const eyeContact = analysis.eyeContactScore || 50;
        const engagement = analysis.engagementScore || 50;
        const confidence = analysis.confidenceScore || 50;
        const attentiveness = analysis.engagementScore || 50; // Use engagement as attentiveness

        // Minimal penalty since Python service doesn't provide cheating indicators yet
        let penalty = 0;
        if ((analysis.analyzedFrames || 0) === 0) penalty += 10; // No frames analyzed

        const baseScore = (
            eyeContact * weights.eyeContact +
            engagement * weights.engagement +
            confidence * weights.confidence +
            attentiveness * weights.attentiveness
        );

        return Math.max(0, Math.min(100, baseScore - penalty));
    }

    /**
     * Calculate audio behavioral score (0-100)
     * @private
     */
    _calculateAudioScore(analysis) {
        const weights = {
            confidence: 0.3,
            clarity: 0.25,
            enthusiasm: 0.2,
            stressControl: 0.15,
            sentiment: 0.1
        };

        const confidence = analysis.toneAnalysis?.confidence || 50;
        const clarity = analysis.toneAnalysis?.clarity || 50;
        const enthusiasm = analysis.toneAnalysis?.enthusiasm || 50;
        const stressLevel = analysis.stressLevel || 50;
        const stressControl = 100 - stressLevel; // Lower stress = higher score

        // Sentiment score
        const sentiment = analysis.overallSentiment?.score || 50;

        const score = (
            confidence * weights.confidence +
            clarity * weights.clarity +
            enthusiasm * weights.enthusiasm +
            stressControl * weights.stressControl +
            sentiment * weights.sentiment
        );

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Generate personalized recommendations
     * @private
     */
    _generateRecommendations(videoAnalysis, audioAnalysis) {
        const recommendations = [];

        // Video-based recommendations
        if (videoAnalysis.metrics.eyeContact < 50) {
            recommendations.push('Maintain better eye contact with the camera');
        }
        if (videoAnalysis.metrics.engagement < 50) {
            recommendations.push('Show more facial engagement and interest');
        }
        if (videoAnalysis.cheatingIndicators.frequentLookAway) {
            recommendations.push('Avoid looking away from the camera frequently');
        }

        // Audio-based recommendations
        if (audioAnalysis.metrics.confidence < 50) {
            recommendations.push('Speak with more confidence and conviction');
        }
        if (audioAnalysis.metrics.clarity < 50) {
            recommendations.push('Improve speech clarity and articulation');
        }
        if (audioAnalysis.metrics.stressLevel > 60) {
            recommendations.push('Try to relax and manage interview stress');
        }
        if (audioAnalysis.metrics.pace === 'fast') {
            recommendations.push('Slow down your speaking pace');
        }

        return recommendations;
    }

    /**
     * Default video analysis fallback
     * @private
     */
    _getDefaultVideoAnalysis() {
        return {
            rawAnalysis: {},
            videoScore: 65,
            metrics: {
                eyeContact: 65,
                engagement: 60,
                confidence: 65,
                attentiveness: 70,
                multiplePersons: false,
                lookingAway: 20
            },
            cheatingIndicators: {
                multiplePersons: false,
                frequentLookAway: false,
                noFaceDetected: false
            }
        };
    }

    /**
     * Default audio analysis fallback
     * @private
     */
    _getDefaultAudioAnalysis() {
        return {
            rawAnalysis: {},
            audioScore: 65,
            metrics: {
                confidence: 65,
                clarity: 70,
                enthusiasm: 60,
                stressLevel: 40,
                pace: 'moderate',
                sentiment: 'neutral'
            }
        };
    }

    /**
     * Health check for Python microservices
     * @returns {Promise<Object>} - Service health status
     */
    async healthCheck() {
        const results = {
            video: false,
            audio: false,
            timestamp: new Date().toISOString()
        };

        try {
            await axios.get(`${VIDEO_ANALYSIS_URL}/health`, { timeout: 5000 });
            results.video = true;
        } catch (error) {
            console.warn('⚠️  Video analysis service not responding');
        }

        try {
            await axios.get(`${AUDIO_ANALYSIS_URL}/health`, { timeout: 5000 });
            results.audio = true;
        } catch (error) {
            console.warn('⚠️  Audio analysis service not responding');
        }

        return results;
    }
}

module.exports = new BehavioralAnalysisService();
