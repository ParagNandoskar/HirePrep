import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { HiCheckCircle, HiClock, HiStar, HiTrendingUp, HiLightBulb, HiChartBar } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'

const InterviewResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { type, role, difficulty, answers, totalQuestions, completedQuestions } = location.state || {}

  const [overallScore, setOverallScore] = useState(0)
  const [breakdown, setBreakdown] = useState({
    confidence: 0,
    communication: 0,
    technical: 0,
    problemSolving: 0
  })

  useEffect(() => {
    if (!type || !role) {
      navigate('/student-dashboard/interview/start')
      return
    }

    // Simulate AI analysis scores
    generateScores()
  }, [])

  const generateScores = () => {
    // Simulate scores based on completed questions and random variance
    const completionRate = (completedQuestions / totalQuestions) * 100
    const baseScore = Math.min(completionRate * 0.8 + Math.random() * 20, 95)
    
    setOverallScore(Math.round(baseScore))
    setBreakdown({
      confidence: Math.round(baseScore - 10 + Math.random() * 20),
      communication: Math.round(baseScore - 5 + Math.random() * 15),
      technical: Math.round(baseScore - 8 + Math.random() * 18),
      problemSolving: Math.round(baseScore - 12 + Math.random() * 22)
    })
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

  const strengths = [
    'Clear articulation of thoughts',
    'Good use of examples',
    'Structured approach to problems',
    'Professional communication style'
  ]

  const improvements = [
    'Provide more specific details in answers',
    'Work on time management',
    'Practice technical terminology',
    'Maintain better eye contact'
  ]

  const tips = [
    'Review fundamental concepts regularly',
    'Practice mock interviews weekly',
    'Record yourself to improve body language',
    'Prepare STAR method responses',
    'Research common interview questions'
  ]

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
            {type.charAt(0).toUpperCase() + type.slice(1)} Interview for {role}
          </p>
        </div>

        {/* Overall Score */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg p-8 text-white">
          <div className="text-center">
            <p className="text-blue-100 text-lg mb-2">Overall Score</p>
            <div className="text-7xl font-bold mb-2">{overallScore}%</div>
            <p className="text-2xl font-semibold text-blue-100">{getScoreLabel(overallScore)}</p>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <HiClock className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm">Questions</p>
                <p className="text-xl font-semibold">{completedQuestions}/{totalQuestions}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <HiStar className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm">Difficulty</p>
                <p className="text-xl font-semibold capitalize">{difficulty}</p>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg p-3">
                <HiTrendingUp className="w-6 h-6 mx-auto mb-1" />
                <p className="text-sm">Ranking</p>
                <p className="text-xl font-semibold">Top 25%</p>
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
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <HiCheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <HiTrendingUp className="w-5 h-5 mr-2 text-yellow-600" />
              Areas for Improvement
            </h3>
            <ul className="space-y-3">
              {improvements.map((improvement, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <span className="text-yellow-600 text-xs font-bold">{index + 1}</span>
                  </div>
                  <span className="text-gray-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HiLightBulb className="w-5 h-5 mr-2 text-purple-600" />
            AI-Generated Tips for Improvement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tips.map((tip, index) => (
              <div key={index} className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-purple-600 text-white text-xs font-bold rounded-full flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700">{tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-4 pb-8">
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/student-dashboard/interview/start')}
            className="px-8 py-3 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-lg"
          >
            Take Another Interview
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default InterviewResults
