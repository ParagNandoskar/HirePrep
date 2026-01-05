import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiCheckCircle, HiStar, HiTrendingUp, HiUsers, HiLightBulb, HiThumbUp, HiExclamation } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { apiService } from '../services/api'

const ScreeningInterviewResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { 
    jobId,
    applicationId,
    interviewId, // Need this for polling
    jobTitle, 
    companyName, 
    score = 0,
    totalQuestions = 0,
    questionsAnswered = 0,
    evaluation = null, // AI evaluation data
    analysisStatus = null, // Track analysis progress
    behavioralScore = 0,
    contentScore = 0,
    videoScore = 0,
    audioScore = 0,
    behavioralInsights = null
  } = location.state || {}

  // State for progressive results
  const [currentScore, setCurrentScore] = useState(score)
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState({
    transcription: true, // Already complete
    aiEvaluation: true, // Already complete
    videoAnalysis: false,
    audioAnalysis: false
  })
  const [videoAnalysisResults, setVideoAnalysisResults] = useState(null)
  const [audioAnalysisResults, setAudioAnalysisResults] = useState(null)

  // Poll for analysis completion every 10 seconds
  useEffect(() => {
    if (!interviewId || !analysisStatus || isAnalysisComplete) {
      return
    }

    console.log('Starting analysis polling for interview:', interviewId)

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiService.get(`/interviews/${interviewId}`)
        const interview = response.data.data

        // Check if analysis is complete
        if (interview.analysisComplete) {
          console.log('✅ Analysis complete! Updating results...')
          
          setIsAnalysisComplete(true)
          setCurrentScore(interview.finalScore || interview.score)
          setVideoAnalysisResults(interview.analysis?.videoAnalysis)
          setAudioAnalysisResults(interview.analysis?.audioAnalysis)
          setAnalysisProgress({
            transcription: true,
            aiEvaluation: true,
            videoAnalysis: true,
            audioAnalysis: true
          })
          
          clearInterval(pollInterval)
        }
      } catch (error) {
        console.error('Error polling analysis status:', error)
      }
    }, 10000) // Poll every 10 seconds

    // Cleanup on unmount
    return () => clearInterval(pollInterval)
  }, [interviewId, analysisStatus, isAnalysisComplete])

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceLevel = (score) => {
    if (score >= 85) return { level: 'Excellent', color: 'bg-green-100 text-green-800 border-green-200' }
    if (score >= 70) return { level: 'Good', color: 'bg-blue-100 text-blue-800 border-blue-200' }
    if (score >= 60) return { level: 'Average', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' }
    return { level: 'Needs Improvement', color: 'bg-red-100 text-red-800 border-red-200' }
  }

  const performance = getPerformanceLevel(currentScore)

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-400 p-8">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <HiCheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Completed!</h1>
            <p className="text-lg text-gray-600">{jobTitle}</p>
            <p className="text-md text-gray-500">{companyName}</p>
          </div>

          {/* Score Display */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-2xl p-8 mb-8 text-center relative">
            {!isAnalysisComplete && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center space-x-2 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-semibold">
                  <div className="animate-spin h-3 w-3 border-2 border-amber-600 border-t-transparent rounded-full"></div>
                  <span>Analyzing...</span>
                </div>
              </div>
            )}
            
            <p className="text-sm font-semibold text-blue-600 mb-2">
              {isAnalysisComplete ? 'FINAL INTERVIEW SCORE' : 'PRELIMINARY SCORE'}
            </p>
            <p className={`text-6xl font-bold ${getScoreColor(currentScore)} mb-3`}>{currentScore}</p>
            <span className={`inline-block px-4 py-2 rounded-full border-2 font-semibold ${performance.color}`}>
              {performance.level}
            </span>
            
            {!isAnalysisComplete && (
              <div className="mt-4 text-sm text-blue-600">
                <p>⏱️ Final score with video/audio analysis coming in 5-10 minutes</p>
              </div>
            )}
          </div>

          {/* Analysis Progress Banner */}
          {!isAnalysisComplete && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
              <div className="flex items-start mb-4">
                <div className="animate-spin h-6 w-6 border-3 border-purple-600 border-t-transparent rounded-full mr-3 mt-1"></div>
                <div>
                  <h3 className="font-bold text-purple-900 mb-2">🎬 Video & Audio Analysis in Progress</h3>
                  <p className="text-sm text-purple-700 mb-4">
                    Your responses are being analyzed for body language, tone, and delivery. 
                    This page will update automatically when complete.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                  <div className="text-green-600 mb-1">✅</div>
                  <p className="text-xs font-semibold text-gray-700">Transcription</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                  <div className="text-green-600 mb-1">✅</div>
                  <p className="text-xs font-semibold text-gray-700">AI Evaluation</p>
                </div>
                <div className={`bg-white rounded-lg p-3 text-center border ${analysisProgress.videoAnalysis ? 'border-green-200' : 'border-amber-200'}`}>
                  <div className={analysisProgress.videoAnalysis ? 'text-green-600' : 'text-amber-600'} style={{ marginBottom: '4px' }}>
                    {analysisProgress.videoAnalysis ? '✅' : '⏳'}
                  </div>
                  <p className="text-xs font-semibold text-gray-700">Video Analysis</p>
                </div>
                <div className={`bg-white rounded-lg p-3 text-center border ${analysisProgress.audioAnalysis ? 'border-green-200' : 'border-amber-200'}`}>
                  <div className={analysisProgress.audioAnalysis ? 'text-green-600' : 'text-amber-600'} style={{ marginBottom: '4px' }}>
                    {analysisProgress.audioAnalysis ? '✅' : '⏳'}
                  </div>
                  <p className="text-xs font-semibold text-gray-700">Audio Analysis</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-3">
                <HiStar className="w-8 h-8 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{questionsAnswered}</p>
              <p className="text-sm text-gray-600">Questions Answered</p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-3">
                <HiTrendingUp className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{Math.round((currentScore / 100) * 100)}%</p>
              <p className="text-sm text-gray-600">Performance Rate</p>
            </div>

            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center">
              <div className="flex justify-center mb-3">
                <HiUsers className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">Top {currentScore >= 85 ? '10%' : currentScore >= 70 ? '25%' : '50%'}</p>
              <p className="text-sm text-gray-600">Estimated Ranking</p>
            </div>
          </div>

          {/* Video/Audio Analysis Results */}
          {(behavioralScore > 0 || videoScore > 0 || audioScore > 0) && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                <HiStar className="w-5 h-5 mr-2" />
                Behavioral Analysis (40% of Final Score)
              </h3>
              
              {/* Score Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4 border border-indigo-200 text-center">
                  <p className="text-sm text-gray-600 mb-1">Content Quality</p>
                  <p className="text-3xl font-bold text-blue-600">{Math.round(contentScore)}</p>
                  <p className="text-xs text-gray-500 mt-1">60% Weight</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-indigo-200 text-center">
                  <p className="text-sm text-gray-600 mb-1">Behavioral Analysis</p>
                  <p className="text-3xl font-bold text-purple-600">{Math.round(behavioralScore)}</p>
                  <p className="text-xs text-gray-500 mt-1">40% Weight</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                  <p className="text-sm text-gray-600 mb-1">Final Score</p>
                  <p className="text-3xl font-bold text-green-600">{Math.round(currentScore)}</p>
                  <p className="text-xs text-gray-500 mt-1">Combined</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Analysis */}
                {videoScore > 0 && behavioralInsights?.videoInsights && (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      📹 Body Language & Presence
                      <span className="ml-auto text-indigo-600 font-bold">{Math.round(videoScore)}%</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Eye Contact:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{width: `${behavioralInsights.videoInsights.eyeContact || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.videoInsights.eyeContact || 0)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Engagement:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{width: `${behavioralInsights.videoInsights.engagement || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.videoInsights.engagement || 0)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Confidence:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{width: `${behavioralInsights.videoInsights.confidence || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.videoInsights.confidence || 0)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Attentiveness:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-indigo-600 h-2 rounded-full" style={{width: `${behavioralInsights.videoInsights.attentiveness || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.videoInsights.attentiveness || 0)}%</span>
                        </div>
                      </div>
                    </div>
                    {behavioralInsights.videoInsights.cheatingIndicators?.length > 0 && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        ⚠️ {behavioralInsights.videoInsights.cheatingIndicators.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Analysis */}
                {audioScore > 0 && behavioralInsights?.audioInsights && (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      🎤 Voice & Delivery
                      <span className="ml-auto text-purple-600 font-bold">{Math.round(audioScore)}%</span>
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Clarity:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-blue-600 h-2 rounded-full" style={{width: `${behavioralInsights.audioInsights.clarity || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.audioInsights.clarity || 0)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Confidence:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-green-600 h-2 rounded-full" style={{width: `${behavioralInsights.audioInsights.confidence || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.audioInsights.confidence || 0)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Enthusiasm:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-yellow-600 h-2 rounded-full" style={{width: `${behavioralInsights.audioInsights.enthusiasm || 0}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(behavioralInsights.audioInsights.enthusiasm || 0)}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Stress Control:</span>
                        <div className="flex items-center">
                          <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                            <div className="bg-purple-600 h-2 rounded-full" style={{width: `${100 - (behavioralInsights.audioInsights.stressLevel || 0)}%`}}></div>
                          </div>
                          <span className="font-semibold text-gray-900 w-10 text-right">{Math.round(100 - (behavioralInsights.audioInsights.stressLevel || 0))}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sentiment:</span>
                        <span className="font-semibold text-gray-900 capitalize">{behavioralInsights.audioInsights.sentiment || 'Neutral'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-xs text-center text-indigo-600 font-medium">
                💡 Analysis uses REAL computer vision and audio signal processing - MediaPipe for facial tracking, Librosa for voice analysis
              </div>
            </div>
          )}

          {/* Fallback for old analysis format */}
          {isAnalysisComplete && (videoAnalysisResults || audioAnalysisResults) && !behavioralScore && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center">
                <HiStar className="w-5 h-5 mr-2" />
                Complete Performance Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Video Analysis */}
                {videoAnalysisResults && (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <h4 className="font-semibold text-gray-900 mb-3">📹 Body Language & Presence</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Eye Contact:</span>
                        <span className="font-semibold text-gray-900">{videoAnalysisResults.eyeContactScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Engagement:</span>
                        <span className="font-semibold text-gray-900">{videoAnalysisResults.engagementScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-gray-900">{videoAnalysisResults.confidenceScore}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Analysis */}
                {audioAnalysisResults && (
                  <div className="bg-white rounded-lg p-4 border border-indigo-200">
                    <h4 className="font-semibold text-gray-900 mb-3">🎤 Voice & Delivery</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Clarity:</span>
                        <span className="font-semibold text-gray-900">{audioAnalysisResults.toneAnalysis?.clarity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-semibold text-gray-900">{audioAnalysisResults.toneAnalysis?.confidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Speech Pace:</span>
                        <span className="font-semibold text-gray-900 capitalize">{audioAnalysisResults.toneAnalysis?.pace}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 text-xs text-center text-indigo-600">
                Analysis weights: 80% Content Quality, 10% Body Language, 10% Voice Delivery
              </div>
            </div>
          )}

          {/* Info Sections */}
          <div className="space-y-4 mb-8">
            {/* Leaderboard Info */}
            <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl">
              <div className="flex items-start">
                <HiStar className="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-2">Job-Specific Leaderboard</h3>
                  <p className="text-sm text-purple-800">
                    Your score has been added to the leaderboard for this specific job posting. 
                    The employer can now see your ranking among all applicants.
                  </p>
                </div>
              </div>
            </div>

            {/* AI Evaluation Feedback */}
            {evaluation && evaluation.feedback && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-purple-500 p-6 rounded-r-xl">
                <div className="flex items-start">
                  <HiLightBulb className="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-3">AI Interview Feedback</h3>
                    <p className="text-sm text-purple-800 whitespace-pre-line">{evaluation.feedback}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Strengths */}
            {evaluation && evaluation.strengths && evaluation.strengths.length > 0 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
                <div className="flex items-start">
                  <HiThumbUp className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-3">Your Strengths</h3>
                    <ul className="text-sm text-green-800 space-y-1">
                      {evaluation.strengths.map((strength, index) => (
                        <li key={index}>✓ {strength}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Areas for Improvement */}
            {evaluation && evaluation.improvements && evaluation.improvements.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 rounded-r-xl">
                <div className="flex items-start">
                  <HiExclamation className="w-6 h-6 text-amber-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900 mb-3">Areas for Growth</h3>
                    <ul className="text-sm text-amber-800 space-y-1">
                      {evaluation.improvements.map((improvement, index) => (
                        <li key={index}>• {improvement}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Top Candidate Info */}
            {currentScore >= 80 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
                <div className="flex items-start">
                  <HiTrendingUp className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">Priority Consideration! 🎉</h3>
                    <p className="text-sm text-green-800">
                      Great job! Your high score qualifies you for priority consideration. 
                      Top performers are automatically highlighted to the employer and moved to the front of the review queue.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
              <div className="flex items-start">
                <HiCheckCircle className="w-6 h-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">What Happens Next?</h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Your interview responses have been analyzed by AI</li>
                    <li>• Your application status will be updated based on your performance</li>
                    <li>• The employer will review top candidates on the leaderboard</li>
                    <li>• You'll receive a notification if you're selected for the next round</li>
                    <li>• Check the job-specific leaderboard to see your ranking</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => navigate('/student-dashboard/applications')}
              className="w-full sm:w-auto px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              View Applications
            </button>
            <button
              onClick={() => navigate(`/student-dashboard/job-leaderboard/${jobId}`, { 
                state: { jobTitle, companyName } 
              })}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              View Job Leaderboard
            </button>
          </div>

          {/* Feedback Tip */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              💡 Tip: Review the job-specific leaderboard to see how you compare with other applicants
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ScreeningInterviewResults
