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

  // Sample interview history data
  const sampleInterviews = [
    {
      id: 1,
      type: 'Technical',
      role: 'Full Stack Developer',
      difficulty: 'Medium',
      date: '2025-12-28',
      duration: '45 min',
      questionsAnswered: 5,
      totalQuestions: 5,
      overallScore: 88,
      breakdown: {
        confidence: 85,
        communication: 90,
        technical: 88,
        problemSolving: 87
      },
      status: 'completed',
      strengths: ['Clear communication', 'Good examples', 'Structured answers'],
      improvements: ['Time management', 'More technical depth']
    },
    {
      id: 2,
      type: 'HR',
      role: 'Product Manager',
      difficulty: 'Easy',
      date: '2025-12-25',
      duration: '30 min',
      questionsAnswered: 5,
      totalQuestions: 5,
      overallScore: 92,
      breakdown: {
        confidence: 95,
        communication: 92,
        technical: 88,
        problemSolving: 93
      },
      status: 'completed',
      strengths: ['Excellent confidence', 'Strong motivation', 'Good career vision'],
      improvements: ['Company research', 'Specific examples']
    },
    {
      id: 3,
      type: 'Behavioral',
      role: 'Frontend Developer',
      difficulty: 'Medium',
      date: '2025-12-22',
      duration: '40 min',
      questionsAnswered: 4,
      totalQuestions: 5,
      overallScore: 75,
      breakdown: {
        confidence: 72,
        communication: 78,
        technical: 74,
        problemSolving: 76
      },
      status: 'completed',
      strengths: ['Good STAR method', 'Real examples'],
      improvements: ['More detail', 'Quantify results', 'Eye contact']
    },
    {
      id: 4,
      type: 'Technical',
      role: 'Backend Engineer',
      difficulty: 'Hard',
      date: '2025-12-20',
      duration: '50 min',
      questionsAnswered: 3,
      totalQuestions: 5,
      overallScore: 68,
      breakdown: {
        confidence: 65,
        communication: 70,
        technical: 68,
        problemSolving: 69
      },
      status: 'completed',
      strengths: ['Problem-solving approach', 'Basic concepts'],
      improvements: ['Advanced concepts', 'Code optimization', 'System design']
    },
    {
      id: 5,
      type: 'HR',
      role: 'Data Scientist',
      difficulty: 'Easy',
      date: '2025-12-18',
      duration: '28 min',
      questionsAnswered: 5,
      totalQuestions: 5,
      overallScore: 85,
      breakdown: {
        confidence: 88,
        communication: 85,
        technical: 82,
        problemSolving: 85
      },
      status: 'completed',
      strengths: ['Clear goals', 'Good energy', 'Professional'],
      improvements: ['Deeper research', 'Ask questions']
    },
    {
      id: 6,
      type: 'Technical',
      role: 'DevOps Engineer',
      difficulty: 'Medium',
      date: '2025-12-15',
      duration: '42 min',
      questionsAnswered: 5,
      totalQuestions: 5,
      overallScore: 81,
      breakdown: {
        confidence: 80,
        communication: 83,
        technical: 81,
        problemSolving: 80
      },
      status: 'completed',
      strengths: ['Infrastructure knowledge', 'Good explanations'],
      improvements: ['Container orchestration', 'CI/CD depth']
    }
  ]

  // Progress data for chart - will be populated from backend data
  const [progressData, setProgressData] = useState([
    { date: 'Dec 15', score: 81, interviews: 1 },
    { date: 'Dec 18', score: 85, interviews: 2 },
    { date: 'Dec 20', score: 68, interviews: 3 },
    { date: 'Dec 22', score: 75, interviews: 4 },
    { date: 'Dec 25', score: 92, interviews: 5 },
    { date: 'Dec 28', score: 88, interviews: 6 }
  ])

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

          setInterviews(mappedInterviews.length > 0 ? mappedInterviews : sampleInterviews)

          // Generate progress data
          if (mappedInterviews.length > 0) {
            const progressPoints = mappedInterviews
              .slice(-6) // Last 6 interviews
              .map((interview, index) => ({
                date: new Date(interview.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                score: interview.overallScore,
                interviews: index + 1
              }))
            setProgressData(progressPoints)
          }
        } else {
          // Use sample data if no backend data
          setInterviews(sampleInterviews)
        }
      } catch (error) {
        console.error('Error fetching interview history:', error)
        // Fallback to sample data
        setInterviews(sampleInterviews)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchInterviewHistory()
    } else {
      setInterviews(sampleInterviews)
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

  const stats = {
    total: interviews.length,
    avgScore: Math.round(interviews.reduce((sum, i) => sum + i.overallScore, 0) / interviews.length),
    completed: interviews.filter(i => i.status === 'completed').length,
    improvement: '+12%'
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
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <HiFilter className="w-5 h-5 mr-2 text-gray-600" />
              Filters
            </h3>
            <button
              onClick={() => navigate('/student-dashboard/interview/start')}
              className="px-4 py-2 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors"
            >
              + New Interview
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
          {filteredInterviews.length === 0 ? (
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
                          type: interview.type.toLowerCase(),
                          role: interview.role,
                          difficulty: interview.difficulty.toLowerCase(),
                          answers: [],
                          totalQuestions: interview.totalQuestions,
                          completedQuestions: interview.questionsAnswered
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
