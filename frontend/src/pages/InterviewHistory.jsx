import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiClock, HiVideoCamera, HiCheckCircle, HiXCircle, HiTrendingUp, HiCalendar, HiFilter, HiPlay } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { useAuth } from '../context/AuthContext'
import { interviewService } from '../services/interviewService'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

const InterviewHistory = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [interviews, setInterviews] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [isLoading, setIsLoading] = useState(true)

  // Progress data for chart - will be populated from backend data
  const [progressData, setProgressData] = useState([])

  useEffect(() => {
    const fetchInterviewHistory = async () => {
      try {
        const response = await interviewService.getInterviewHistory({
          page: 1,
          limit: 50,
          status: 'completed'
        })

        if (response.success && response.data && response.data.interviews) {
          // Map backend data to frontend format
          const mappedInterviews = response.data.interviews.map(interview => ({
            id: interview._id,
            type: interview.type || 'Technical',
            role: interview.role || 'Unknown',
            difficulty: interview.difficulty || 'Medium',
            date: new Date(interview.createdAt).toISOString().split('T')[0],
            duration: `${Math.floor(interview.totalDuration / 60)} min`,
            questionsAnswered: interview.completedQuestions || 0,
            totalQuestions: interview.totalQuestions || 5,
            overallScore: interview.finalScore || 0,
            breakdown: {
              confidence: interview.scores?.confidence || 0,
              communication: interview.scores?.communication || 0,
              technical: interview.scores?.technical || 0,
              problemSolving: interview.scores?.problemSolving || 0
            },
            status: interview.status,
            strengths: interview.feedback?.strengths || [],
            improvements: interview.feedback?.improvements || []
          }))

          setInterviews(mappedInterviews)

          // Generate progress data from real interviews
          if (mappedInterviews.length > 0) {
            // Sort by date and take last 6
            const sortedInterviews = [...mappedInterviews].sort((a, b) => 
              new Date(a.date) - new Date(b.date)
            );
            const last6 = sortedInterviews.slice(-6);
            
            const progressPoints = last6.map((interview, index) => ({
              date: new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              score: interview.overallScore,
              interviews: index + 1
            }));
            setProgressData(progressPoints);
          } else {
            setProgressData([]);
          }
        } else {
          // No interviews found
          setInterviews([])
          setProgressData([])
        }
      } catch (error) {
        console.error('Error fetching interview history:', error)
        setInterviews([])
        setProgressData([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchInterviewHistory()
    } else {
      setInterviews([])
      setIsLoading(false)
    }
  }, [user])

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score) => {
    if (score >= 85) return 'bg-green-100 border-green-300'
    if (score >= 70) return 'bg-yellow-100 border-yellow-300'
    return 'bg-red-100 border-red-300'
  }

  const getDifficultyColor = (difficulty) => {
    const colors = {
      'Easy': 'bg-green-100 text-green-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Hard': 'bg-red-100 text-red-800'
    }
    return colors[difficulty] || colors.Medium
  }

  const getTypeIcon = (type) => {
    if (type === 'Technical') return '💻'
    if (type === 'HR') return '👔'
    return '🎯'
  }

  const filteredInterviews = interviews.filter(interview => {
    if (selectedFilter === 'all' && selectedType === 'all') return true
    if (selectedFilter !== 'all') {
      const scoreCheck = selectedFilter === 'excellent' ? interview.overallScore >= 85 :
                        selectedFilter === 'good' ? interview.overallScore >= 70 && interview.overallScore < 85 :
                        interview.overallScore < 70
      if (!scoreCheck) return false
    }
    if (selectedType !== 'all' && interview.type !== selectedType) return false
    return true
  })

  // Calculate statistics dynamically
  const calculateImprovement = () => {
    if (interviews.length < 2) return '+0%';
    const sortedByDate = [...interviews].sort((a, b) => new Date(a.date) - new Date(b.date));
    const firstScore = sortedByDate[0].overallScore;
    const lastScore = sortedByDate[sortedByDate.length - 1].overallScore;
    const improvement = lastScore - firstScore;
    return improvement >= 0 ? `+${improvement}%` : `${improvement}%`;
  };

  const stats = {
    total: interviews.length,
    avgScore: interviews.length > 0 ? Math.round(interviews.reduce((sum, i) => sum + i.overallScore, 0) / interviews.length) : 0,
    completed: interviews.filter(i => i.status === 'completed').length,
    improvement: calculateImprovement()
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Interview History</h1>
          <p className="text-gray-600">Track your progress and review past interviews</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Interviews</p>
              <HiVideoCamera className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average Score</p>
              <HiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.avgScore}%</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Completed</p>
              <HiClock className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Improvement</p>
              <HiTrendingUp className="w-5 h-5 text-yellow-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.improvement}</p>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trend</h3>
          {progressData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <HiTrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data to display</p>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <HiFilter className="w-5 h-5 mr-2 text-gray-600" />
              Filters
            </h3>
            <button
              onClick={() => navigate('/student-dashboard/applications')}
              className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
            >
              View Applications
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Score Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Performance</label>
              <div className="flex space-x-2">
                {[
                  { id: 'all', name: 'All' },
                  { id: 'excellent', name: 'Excellent (85+)' },
                  { id: 'good', name: 'Good (70-84)' },
                  { id: 'needs-improvement', name: 'Needs Work (<70)' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedFilter === filter.id
                        ? 'bg-blue-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interview Type</label>
              <div className="flex space-x-2">
                {[
                  { id: 'all', name: 'All Types' },
                  { id: 'Technical', name: 'Technical' },
                  { id: 'HR', name: 'HR' },
                  { id: 'Behavioral', name: 'Behavioral' }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedType === type.id
                        ? 'bg-blue-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Interview List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading interview history...</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <HiVideoCamera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">No Interviews Yet</p>
              <p className="text-gray-500 mb-4">Complete job application interviews to see your history here</p>
              <button
                onClick={() => navigate('/student-dashboard/applications')}
                className="px-6 py-2 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
              >
                View Applications
              </button>
            </div>
          ) : filteredInterviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
              <HiVideoCamera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No interviews match your filters</p>
              <button
                onClick={() => {
                  setSelectedFilter('all')
                  setSelectedType('all')
                }}
                className="text-blue-700 font-medium hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredInterviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Left Side */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-3xl">{getTypeIcon(interview.type)}</span>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{interview.role}</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{interview.type} Interview</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <HiCalendar className="w-4 h-4 mr-1" />
                            {new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span>•</span>
                          <span className="flex items-center">
                            <HiClock className="w-4 h-4 mr-1" />
                            {interview.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 mb-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(interview.difficulty)}`}>
                        {interview.difficulty}
                      </span>
                      <span className="text-sm text-gray-600">
                        {interview.questionsAnswered}/{interview.totalQuestions} questions answered
                      </span>
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {Object.entries(interview.breakdown).map(([key, value]) => (
                        <div key={key} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className={`text-lg font-bold ${getScoreColor(value)}`}>{value}%</p>
                        </div>
                      ))}
                    </div>

                    {/* Strengths and Improvements */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-2">✓ Strengths</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {interview.strengths.slice(0, 2).map((strength, idx) => (
                            <li key={idx}>• {strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-yellow-700 mb-2">→ Improvements</p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {interview.improvements.slice(0, 2).map((improvement, idx) => (
                            <li key={idx}>• {improvement}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Score */}
                  <div className="ml-6 text-center">
                    <div className={`w-24 h-24 rounded-full border-4 ${getScoreBgColor(interview.overallScore)} flex items-center justify-center mb-3`}>
                      <div>
                        <p className={`text-2xl font-bold ${getScoreColor(interview.overallScore)}`}>
                          {interview.overallScore}
                        </p>
                        <p className="text-xs text-gray-600">Score</p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/student-dashboard/interview/results', {
                        state: {
                          applicationId: interview.id,
                          interviewId: interview.id
                        }
                      })}
                      className="w-full px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center space-x-1"
                    >
                      <HiPlay className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default InterviewHistory
