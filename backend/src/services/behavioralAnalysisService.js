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
            
            // Calculate behavioral score from video analysis
            const videoScore = this._calculateVideoScore(analysis);
            
            return {
                rawAnalysis: analysis,
                videoScore: videoScore,
                metrics: {
                    eyeContact: analysis.eyeContact || 0,
                    engagement: analysis.engagement || 0,
                    confidence: analysis.confidence || 0,
                    attentiveness: analysis.attentiveness || 0,
                    multiplePersons: analysis.multiplePersonsDetected || false,
                    lookingAway: analysis.lookingAwayPercentage || 0
                },
                cheatingIndicators: {
                    multiplePersons: analysis.multiplePersonsDetected || false,
                    frequentLookAway: (analysis.lookingAwayPercentage || 0) > 50,
                    noFaceDetected: analysis.noFaceFrames > (videoFrames.length * 0.3)
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
     * @param {Array<string>} audioChunks - Array of base64 encoded audio chunks
     * @param {string} interviewId - Interview session ID
     * @returns {Promise<Object>} - Audio analysis results
     */
    async analyzeAudio(audioChunks, interviewId) {
        try {
            console.log(`🎤 Analyzing ${audioChunks.length} audio chunks for interview ${interviewId}...`);
            
            const response = await axios.post(`${AUDIO_ANALYSIS_URL}/analyze-audio`, {
                audioChunks: audioChunks,
                interviewId: interviewId
            }, {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const analysis = response.data;
            
            // Calculate behavioral score from audio analysis
            const audioScore = this._calculateAudioScore(analysis);
            
            return {
                rawAnalysis: analysis,
                audioScore: audioScore,
                metrics: {
                    confidence: analysis.toneAnalysis?.confidence || 0,
                    clarity: analysis.toneAnalysis?.clarity || 0,
                    enthusiasm: analysis.toneAnalysis?.enthusiasm || 0,
                    stressLevel: analysis.stressLevel || 0,
                    pace: analysis.toneAnalysis?.pace || 'moderate',
                    sentiment: analysis.overallSentiment?.sentiment || 'neutral'
                }
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
        // Weighted combination: 50% video, 50% audio
        const combinedScore = (videoAnalysis.videoScore * 0.5) + (audioAnalysis.audioScore * 0.5);
        
        return {
            overallBehavioralScore: Math.round(combinedScore),
            videoScore: Math.round(videoAnalysis.videoScore),
            audioScore: Math.round(audioAnalysis.audioScore),
            detailedMetrics: {
                video: videoAnalysis.metrics,
                audio: audioAnalysis.metrics
            },
            cheatingIndicators: videoAnalysis.cheatingIndicators,
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

        const eyeContact = analysis.eyeContact || 50;
        const engagement = analysis.engagement || 50;
        const confidence = analysis.confidence || 50;
        const attentiveness = analysis.attentiveness || 50;

        // Penalties for cheating indicators
        let penalty = 0;
        if (analysis.multiplePersonsDetected) penalty += 20;
        if ((analysis.lookingAwayPercentage || 0) > 50) penalty += 15;
        if (analysis.noFaceFrames > (analysis.analyzedFrames * 0.3)) penalty += 10;

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
