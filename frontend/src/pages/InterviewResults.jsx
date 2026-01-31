import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiCheckCircle, HiClock, HiStar, HiTrendingUp, HiLightBulb, HiChartBar, HiExclamationCircle, HiBookOpen, HiAcademicCap, HiSparkles, HiArrowRight } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { apiService } from '../services/api'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

const InterviewResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { interviewId, applicationId } = location.state || {}

  const [isLoading, setIsLoading] = useState(true)
  const [interviewData, setInterviewData] = useState(null)
  const [overallScore, setOverallScore] = useState(0)
  const [breakdown, setBreakdown] = useState({
    confidence: 0,
    communication: 0,
    technical: 0,
    problemSolving: 0
  })
  const [allInterviews, setAllInterviews] = useState([])
  const [showingList, setShowingList] = useState(false)
  const [detailedFeedback, setDetailedFeedback] = useState(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  useEffect(() => {
    if (!applicationId && !interviewId) {
      // If no specific interview, show list of all completed interviews
      setShowingList(true)
      fetchAllInterviews()
      return
    }

    // Reset to detail view when we have an ID
    setShowingList(false)
    // Fetch specific interview data
    fetchInterviewData()
  }, [applicationId, interviewId])

  const fetchAllInterviews = async () => {
    try {
      setIsLoading(true)
      // Fetch completed applications with interview data
      const response = await apiService.get('/candidates/applications')
      
      console.log('📊 Applications response:', response)
      
      if (response.success) {
        // Get applications array - handle different response structures
        const applications = response.data?.applications || response.applications || response.data || []
        
        console.log('📋 Applications array:', applications)
        console.log('📋 First application:', applications[0])
        
        // Filter interviews - more lenient condition
        const completedInterviews = applications.filter(app => {
          // Check if interview is completed in any way
          const hasInterviewData = app.interviewCompleted || 
                                   app.interviewStatus === 'completed' || 
                                   app.status === 'interviewed' ||
                                   (app.interviewScore && app.interviewScore > 0)
          
          console.log(`App ${app._id}: interviewCompleted=${app.interviewCompleted}, status=${app.status}, score=${app.interviewScore}, hasInterviewData=${hasInterviewData}`)
          
          return hasInterviewData
        }).map(app => {
          // Handle both 'job' and 'jobId' field names, and nested vs direct data
          const job = app.job || app.jobId
          const company = job?.company || job?.companyId
          
          console.log(`Mapping app ${app._id}:`, {
            jobTitle: job?.title,
            companyName: company?.name,
            score: app.interviewScore || app.screeningScore
          })
          
          return {
            _id: app._id,
            applicationId: app._id,
            jobTitle: job?.title || 'Interview Position',
            companyName: company?.name || 'Company Name',
            score: app.interviewScore || app.screeningScore || 0,
            completedAt: app.interviewCompletedAt,
            status: app.status
          }
        })
        
        console.log('✅ Completed interviews:', completedInterviews)
        setAllInterviews(completedInterviews)
      }
    } catch (error) {
      console.error('Error fetching interviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchInterviewData = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.get(`/applications/${applicationId}`)
      
      if (response.success && response.data) {
        const app = response.data
        const aiAnalysis = app.aiAnalysis || {}
        const scores = aiAnalysis.scores || {}
        
        setInterviewData({
          jobTitle: app.jobId?.title || 'Unknown Position',
          companyName: app.jobId?.companyId?.name || 'Unknown Company',
          type: 'Screening',
          difficulty: 'Medium',
          totalQuestions: 5,
          completedQuestions: app.questionsAnswered || 5,
          strengths: aiAnalysis.strengths || [],
          improvements: aiAnalysis.improvements || [],
          insights: aiAnalysis.insights || '',
          behavioralInsights: aiAnalysis.behavioralInsights || '',
          recommendation: aiAnalysis.recommendation || '',
          integrityWarning: aiAnalysis.integrityWarning || null
        })
        
        setOverallScore(app.screeningScore || 0)
        setBreakdown({
          confidence: scores.behavioral || scores.video || 0,
          communication: scores.communication || 0,
          technical: scores.technical || 0,
          problemSolving: scores.problemSolving || 0
        })
        
        // Fetch detailed AI feedback
        fetchDetailedFeedback()
      }
    } catch (error) {
      console.error('Error fetching interview data:', error)
      navigate('/student-dashboard/applications')
    } finally {
      setIsLoading(false)
    }
  }
  
  const fetchDetailedFeedback = async () => {
    try {
      setFeedbackLoading(true)
      const response = await apiService.get(`/applications/${applicationId}/detailed-feedback`)
      
      if (response.success && response.data) {
        setDetailedFeedback(response.data)
      }
    } catch (error) {
      console.error('Error fetching detailed feedback:', error)
      // If feedback generation fails, we'll show basic analysis instead
    } finally {
      setFeedbackLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score) => {
    if (score >= 85) return 'bg-green-100'
    if (score >= 70) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getScoreLabel = (score) => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 50) return 'Average'
    return 'Needs Improvement'
  }

  const pieData = [
    { name: 'Confidence', value: breakdown.confidence, color: '#3b82f6' },
    { name: 'Communication', value: breakdown.communication, color: '#10b981' },
    { name: 'Technical', value: breakdown.technical, color: '#8b5cf6' },
    { name: 'Problem Solving', value: breakdown.problemSolving, color: '#f59e0b' }
  ]

  const barData = [
    { skill: 'Confidence', score: breakdown.confidence, average: 75 },
    { skill: 'Communication', score: breakdown.communication, average: 78 },
    { skill: 'Technical', score: breakdown.technical, average: 70 },
    { skill: 'Problem Solving', score: breakdown.problemSolving, average: 72 }
  ]

  if (isLoading) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview results...</p>
        </div>
      </DashboardLayout>
    )
  }

  // Show list of completed interviews when accessed from sidebar
  if (showingList) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Results & Analytics</h1>
            <p className="text-gray-600">View detailed results and performance analytics for all your completed interviews</p>
          </div>

          {allInterviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <HiChartBar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Interviews Yet</h3>
              <p className="text-gray-600 mb-6">Complete an interview to see your results and analytics here</p>
              <button
                onClick={() => navigate('/student-dashboard/applications')}
                className="px-6 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
              >
                Browse Jobs & Apply
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allInterviews.map((interview) => (
                <div
                  key={interview._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate('/student-dashboard/results', {
                    state: { applicationId: interview.applicationId }
                  })}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {interview.jobTitle}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {interview.companyName}
                      </p>
                    </div>
                    <div className={`text-2xl font-bold ${
                      interview.score >= 85 ? 'text-green-600' : 
                      interview.score >= 70 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {interview.score}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {interview.completedAt ? new Date(interview.completedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }) : 'Recently completed'}
                    </span>
                    <span className="text-blue-600 font-medium hover:text-blue-700">
                      View Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  if (!interviewData) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-gray-600">Interview data not found</p>
          <button
            onClick={() => navigate('/student-dashboard/applications')}
            className="mt-4 px-6 py-2 bg-blue-700 text-white rounded-lg"
          >
            Back to Applications
          </button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <HiCheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Completed!</h1>
          <p className="text-gray-600">
            {interviewData.type} Interview for {interviewData.jobTitle}
          </p>
          <p className="text-sm text-gray-500">{interviewData.companyName}</p>
        </div>

        {/* Overall Score */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg p-8 text-white">
          <div className="text-center">
            <p className="text-blue-100 text-lg mb-2">Overall Score</p>
            <div className="text-7xl font-bold mb-2">{overallScore}%</div>
            <p className="text-2xl font-semibold text-blue-100">{getScoreLabel(overallScore)}</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-white/30 rounded-lg p-4 border border-white/40">
                <HiClock className="w-6 h-6 mx-auto mb-2 text-white" />
                <p className="text-sm text-white/90 mb-1">Questions</p>
                <p className="text-xl font-bold text-white">{interviewData.completedQuestions}/{interviewData.totalQuestions}</p>
              </div>
              <div className="bg-white/30 rounded-lg p-4 border border-white/40">
                <HiStar className="w-6 h-6 mx-auto mb-2 text-white" />
                <p className="text-sm text-white/90 mb-1">Difficulty</p>
                <p className="text-xl font-bold text-white">{interviewData.difficulty}</p>
              </div>
              <div className="bg-white/30 rounded-lg p-4 border border-white/40">
                <HiTrendingUp className="w-6 h-6 mx-auto mb-2 text-white" />
                <p className="text-sm text-white/90 mb-1">Ranking</p>
                <p className="text-xl font-bold text-white">Top {overallScore >= 85 ? '10%' : overallScore >= 70 ? '25%' : '50%'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HiChartBar className="w-5 h-5 mr-2 text-blue-600" />
              Score Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HiTrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Your Score vs Average
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="skill" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#3b82f6" name="Your Score" />
                <Bar dataKey="average" fill="#e5e7eb" name="Average Score" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <p className="text-sm text-gray-600 mb-2 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </p>
              <div className="flex items-baseline space-x-2">
                <span className={`text-3xl font-bold ${getScoreColor(value)}`}>
                  {value}%
                </span>
                <span className="text-sm text-gray-500">/100</span>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBgColor(value).replace('bg-', 'bg-').replace('-100', '-500')}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Strengths and Areas for Improvement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HiStar className="w-5 h-5 mr-2 text-green-600" />
              Your Strengths
            </h3>
            <ul className="space-y-3">
              {interviewData.strengths && interviewData.strengths.length > 0 ? (
                interviewData.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <HiCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm">No specific strengths identified</li>
              )}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HiTrendingUp className="w-5 h-5 mr-2 text-yellow-600" />
              Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {interviewData.improvements && interviewData.improvements.length > 0 ? (
                interviewData.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                      <span className="text-yellow-600 text-xs font-bold">{index + 1}</span>
                    </div>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500 text-sm">Keep up the good work!</li>
              )}
            </ul>
          </div>
        </div>

        {/* AI Insights & Recommendations */}
        {(interviewData.insights || interviewData.behavioralInsights || interviewData.recommendation) && (
          <div className="space-y-6">
            {/* AI Insights */}
            {interviewData.insights && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-sm border-2 border-purple-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <HiSparkles className="w-6 h-6 mr-2 text-purple-600" />
                  AI Insights
                </h3>
                <p className="text-gray-700 leading-relaxed text-base">
                  {interviewData.insights}
                </p>
              </div>
            )}

            {/* Behavioral Insights */}
            {interviewData.behavioralInsights && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-sm border-2 border-blue-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <HiAcademicCap className="w-6 h-6 mr-2 text-blue-600" />
                  Behavioral Analysis
                </h3>
                <p className="text-gray-700 leading-relaxed text-base">
                  {interviewData.behavioralInsights}
                </p>
              </div>
            )}

            {/* Final Recommendation */}
            {interviewData.recommendation && (
              <div className={`rounded-2xl shadow-sm border-2 p-6 ${
                overallScore >= 85 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                  : overallScore >= 70 
                  ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200'
                  : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
              }`}>
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <HiLightBulb className={`w-6 h-6 mr-2 ${
                    overallScore >= 85 ? 'text-green-600' : overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                  Final Recommendation
                </h3>
                <p className="text-gray-700 leading-relaxed text-base font-medium">
                  {interviewData.recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Detailed Improvement Roadmap */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <HiBookOpen className="w-6 h-6 mr-2 text-indigo-600" />
            Personalized Improvement Roadmap
          </h3>
          
          {feedbackLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-700 mx-auto mb-4"></div>
              <p className="text-gray-600">Generating personalized feedback with AI...</p>
            </div>
          ) : detailedFeedback ? (
            // AI-Generated Detailed Feedback
            <div className="space-y-6">
              {/* Executive Summary */}
              {detailedFeedback.summary && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-indigo-200">
                  <h4 className="text-base font-bold text-gray-900 mb-2">📊 Performance Summary</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">{detailedFeedback.summary}</p>
                </div>
              )}

              {/* Detailed Analysis */}
              {detailedFeedback.detailedAnalysis && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">📝 Detailed Analysis</h4>
                  <p className="text-gray-700 text-sm leading-relaxed">{detailedFeedback.detailedAnalysis}</p>
                </div>
              )}

              {/* Skill Breakdown */}
              {detailedFeedback.skillBreakdown && (
                <div className="space-y-6 mt-6">
                  {/* Communication */}
                  {detailedFeedback.skillBreakdown.communication && (
                    <div className="border-l-4 border-blue-500 pl-6 py-4">
                      <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        💬 Communication Skills
                        <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(detailedFeedback.skillBreakdown.communication.score)} ${getScoreColor(detailedFeedback.skillBreakdown.communication.score)}`}>
                          {detailedFeedback.skillBreakdown.communication.score}%
                        </span>
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.communication.feedback}</p>
                        
                        <p className="font-medium text-blue-900">Why it matters:</p>
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.communication.whyItMatters}</p>
                        
                        <p className="font-medium text-blue-900 mt-4">How to improve:</p>
                        <ul className="text-sm space-y-2 ml-4">
                          {detailedFeedback.skillBreakdown.communication.howToImprove?.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <HiArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Technical */}
                  {detailedFeedback.skillBreakdown.technical && (
                    <div className="border-l-4 border-purple-500 pl-6 py-4">
                      <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        💻 Technical Knowledge
                        <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(detailedFeedback.skillBreakdown.technical.score)} ${getScoreColor(detailedFeedback.skillBreakdown.technical.score)}`}>
                          {detailedFeedback.skillBreakdown.technical.score}%
                        </span>
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.technical.feedback}</p>
                        
                        <p className="font-medium text-purple-900">Why it matters:</p>
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.technical.whyItMatters}</p>
                        
                        <p className="font-medium text-purple-900 mt-4">How to improve:</p>
                        <ul className="text-sm space-y-2 ml-4">
                          {detailedFeedback.skillBreakdown.technical.howToImprove?.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <HiArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-1 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Problem Solving */}
                  {detailedFeedback.skillBreakdown.problemSolving && (
                    <div className="border-l-4 border-orange-500 pl-6 py-4">
                      <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        🧩 Problem Solving
                        <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(detailedFeedback.skillBreakdown.problemSolving.score)} ${getScoreColor(detailedFeedback.skillBreakdown.problemSolving.score)}`}>
                          {detailedFeedback.skillBreakdown.problemSolving.score}%
                        </span>
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.problemSolving.feedback}</p>
                        
                        <p className="font-medium text-orange-900">Why it matters:</p>
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.problemSolving.whyItMatters}</p>
                        
                        <p className="font-medium text-orange-900 mt-4">How to improve:</p>
                        <ul className="text-sm space-y-2 ml-4">
                          {detailedFeedback.skillBreakdown.problemSolving.howToImprove?.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <HiArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-1 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Confidence */}
                  {detailedFeedback.skillBreakdown.confidence && (
                    <div className="border-l-4 border-green-500 pl-6 py-4">
                      <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                        🎯 Confidence & Presence
                        <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(detailedFeedback.skillBreakdown.confidence.score)} ${getScoreColor(detailedFeedback.skillBreakdown.confidence.score)}`}>
                          {detailedFeedback.skillBreakdown.confidence.score}%
                        </span>
                      </h4>
                      <div className="space-y-3 text-gray-700">
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.confidence.feedback}</p>
                        
                        <p className="font-medium text-green-900">Why it matters:</p>
                        <p className="text-sm leading-relaxed">{detailedFeedback.skillBreakdown.confidence.whyItMatters}</p>
                        
                        <p className="font-medium text-green-900 mt-4">How to improve:</p>
                        <ul className="text-sm space-y-2 ml-4">
                          {detailedFeedback.skillBreakdown.confidence.howToImprove?.map((tip, index) => (
                            <li key={index} className="flex items-start">
                              <HiArrowRight className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pro Tips */}
              {detailedFeedback.proTips && detailedFeedback.proTips.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200 mt-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <HiSparkles className="w-6 h-6 mr-2 text-indigo-600" />
                    Pro Tips for Your Next Interview
                  </h4>
                  <ul className="space-y-3 text-gray-700">
                    {detailedFeedback.proTips.map((tip, index) => (
                      <li key={index} className="flex items-start">
                        <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">{index + 1}</span>
                        <span className="text-sm">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Final Recommendation */}
              {detailedFeedback.finalRecommendation && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200 mt-6">
                  <h4 className="text-base font-bold text-gray-900 mb-2 flex items-center">
                    <HiCheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Final Recommendation
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed">{detailedFeedback.finalRecommendation}</p>
                </div>
              )}
            </div>
          ) : (
            // Fallback to hardcoded tips for old interviews without AI feedback
            <div className="space-y-6">
            {/* Communication Skills */}
            {breakdown.communication < 85 && (
              <div className="border-l-4 border-blue-500 pl-6 py-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  💬 Communication Skills
                  <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(breakdown.communication)} ${getScoreColor(breakdown.communication)}`}>
                    {breakdown.communication}%
                  </span>
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p className="font-medium text-blue-900">Why it matters:</p>
                  <p className="text-sm leading-relaxed">Clear communication is crucial for conveying your ideas, collaborating with teams, and presenting solutions effectively.</p>
                  
                  <p className="font-medium text-blue-900 mt-4">How to improve:</p>
                  <ul className="text-sm space-y-2 ml-4">
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Practice STAR Method:</strong> Structure your answers using Situation, Task, Action, Result framework</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Speak Clearly:</strong> Maintain a steady pace, avoid filler words like "um" and "like"</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Be Concise:</strong> Answer in 1-2 minutes, then ask if they want more details</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Record Yourself:</strong> Practice mock interviews and review your responses</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Technical Skills */}
            {breakdown.technical < 85 && (
              <div className="border-l-4 border-purple-500 pl-6 py-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  💻 Technical Knowledge
                  <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(breakdown.technical)} ${getScoreColor(breakdown.technical)}`}>
                    {breakdown.technical}%
                  </span>
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p className="font-medium text-purple-900">Why it matters:</p>
                  <p className="text-sm leading-relaxed">Strong technical knowledge demonstrates your ability to perform the job and solve real-world problems.</p>
                  
                  <p className="font-medium text-purple-900 mt-4">How to improve:</p>
                  <ul className="text-sm space-y-2 ml-4">
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Study Job Requirements:</strong> Review the job description and focus on required skills</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Build Projects:</strong> Create portfolio projects demonstrating your technical abilities</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Learn by Doing:</strong> Complete coding challenges on platforms like LeetCode or HackerRank</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-purple-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Stay Updated:</strong> Follow industry blogs, attend webinars, and take online courses</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Problem Solving */}
            {breakdown.problemSolving < 85 && (
              <div className="border-l-4 border-orange-500 pl-6 py-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  🧩 Problem Solving
                  <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(breakdown.problemSolving)} ${getScoreColor(breakdown.problemSolving)}`}>
                    {breakdown.problemSolving}%
                  </span>
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p className="font-medium text-orange-900">Why it matters:</p>
                  <p className="text-sm leading-relaxed">Employers value candidates who can analyze problems, think critically, and propose effective solutions.</p>
                  
                  <p className="font-medium text-orange-900 mt-4">How to improve:</p>
                  <ul className="text-sm space-y-2 ml-4">
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Think Aloud:</strong> Verbalize your thought process when solving problems</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Ask Clarifying Questions:</strong> Ensure you understand the problem before jumping to solutions</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Practice Case Studies:</strong> Work through business cases and technical challenges</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-orange-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Learn Frameworks:</strong> Study problem-solving frameworks like First Principles thinking</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Confidence & Body Language */}
            {breakdown.confidence < 85 && (
              <div className="border-l-4 border-green-500 pl-6 py-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                  🎯 Confidence & Presence
                  <span className={`ml-3 text-sm px-3 py-1 rounded-full ${getScoreBgColor(breakdown.confidence)} ${getScoreColor(breakdown.confidence)}`}>
                    {breakdown.confidence}%
                  </span>
                </h4>
                <div className="space-y-3 text-gray-700">
                  <p className="font-medium text-green-900">Why it matters:</p>
                  <p className="text-sm leading-relaxed">Confidence and good body language show that you believe in your abilities and can handle workplace challenges.</p>
                  
                  <p className="font-medium text-green-900 mt-4">How to improve:</p>
                  <ul className="text-sm space-y-2 ml-4">
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Maintain Eye Contact:</strong> Look at the camera (not the screen) to simulate eye contact</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Sit Up Straight:</strong> Good posture conveys confidence and professionalism</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Practice Power Poses:</strong> Spend 2 minutes in a power pose before interviews</span>
                    </li>
                    <li className="flex items-start">
                      <HiArrowRight className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                      <span><strong>Smile & Be Authentic:</strong> Show genuine enthusiasm for the opportunity</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* General Tips */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <HiSparkles className="w-6 h-6 mr-2 text-indigo-600" />
                Pro Tips for Your Next Interview
              </h4>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">1</span>
                  <span className="text-sm"><strong>Research the Company:</strong> Understand their mission, products, and recent news</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">2</span>
                  <span className="text-sm"><strong>Prepare Questions:</strong> Have 3-5 thoughtful questions ready for the interviewer</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">3</span>
                  <span className="text-sm"><strong>Test Your Setup:</strong> Check camera, microphone, and internet connection beforehand</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">4</span>
                  <span className="text-sm"><strong>Take Mock Interviews:</strong> Practice makes perfect - do more mock interviews to build confidence</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">5</span>
                  <span className="text-sm"><strong>Follow Up:</strong> Send a thank-you email within 24 hours of the interview</span>
                </li>
              </ul>
            </div>
            </div>
          )}
        </div>

        {/* Integrity Warning (if any) */}
        {interviewData.integrityWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center">
              <HiExclamationCircle className="w-6 h-6 mr-2 text-red-600" />
              Important Notice
            </h3>
            <p className="text-red-800 leading-relaxed">
              {interviewData.integrityWarning}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 pb-8">
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/student-dashboard/applications')}
            className="px-8 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-lg"
          >
            View Applications
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default InterviewResults
