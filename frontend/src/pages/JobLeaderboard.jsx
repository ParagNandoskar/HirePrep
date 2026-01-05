import React, { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { HiBadgeCheck, HiStar, HiChartBar, HiArrowLeft } from 'react-icons/hi'
import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import * as screeningInterviewService from '../services/screeningInterviewService'

const JobLeaderboard = () => {
  const { jobId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { jobTitle, companyName } = location.state || {}

  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCandidates: 0,
    averageScore: 0,
    topScore: 0
  })

  const isEmployer = user?.role === 'employer'

  useEffect(() => {
    fetchLeaderboard()
  }, [jobId])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      
      // Call backend API to get job leaderboard
      const response = await screeningInterviewService.getJobLeaderboard(jobId)
      
      // Map backend data to frontend format
      const leaderboardData = response.data.leaderboard.map(candidate => ({
        id: candidate.candidateId,
        rank: candidate.rank,
        candidateName: candidate.candidateName,
        candidateEmail: candidate.candidateEmail,
        score: candidate.score,
        interviewDate: candidate.interviewDate,
        questionsAnswered: 8, // This should come from backend
        isCurrentUser: candidate.candidateId === user?.id,
        isTopPerformer: candidate.isTopPerformer
      }))

      setLeaderboard(leaderboardData)
      setStats(response.data.stats)
      
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      
      // Fallback to mock data if API fails
      const mockLeaderboard = [
        { 
          id: 1, 
          rank: 1, 
          candidateName: 'Sarah Johnson', 
          score: 95, 
          interviewDate: '2025-01-01', 
          questionsAnswered: 8,
          isCurrentUser: false
        },
        { 
          id: 2, 
          rank: 2, 
          candidateName: 'Michael Chen', 
          score: 92, 
          interviewDate: '2025-01-02', 
          questionsAnswered: 8,
          isCurrentUser: false
        },
        { 
          id: 3, 
          rank: 3, 
          candidateName: 'Emily Davis', 
          score: 88, 
          interviewDate: '2025-01-01', 
          questionsAnswered: 8,
          isCurrentUser: false
        },
        { 
          id: 4, 
          rank: 4, 
          candidateName: 'You', 
          score: 85, 
          interviewDate: '2025-01-03', 
          questionsAnswered: 8,
          isCurrentUser: true
        },
        { 
          id: 5, 
          rank: 5, 
          candidateName: 'James Wilson', 
          score: 82, 
          interviewDate: '2025-01-02', 
          questionsAnswered: 8,
          isCurrentUser: false
        },
        { 
          id: 6, 
          rank: 6, 
          candidateName: 'Lisa Anderson', 
          score: 78, 
          interviewDate: '2025-01-03', 
          questionsAnswered: 8,
          isCurrentUser: false
        },
        { 
          id: 7, 
          rank: 7, 
          candidateName: 'David Martinez', 
          score: 75, 
          interviewDate: '2025-01-01', 
          questionsAnswered: 8,
          isCurrentUser: false
        },
        { 
          id: 8, 
          rank: 8, 
          candidateName: 'Anna Thompson', 
          score: 72, 
          interviewDate: '2025-01-02', 
          questionsAnswered: 8,
          isCurrentUser: false
        }
      ]

      setLeaderboard(mockLeaderboard)
      
      // Calculate stats
      const scores = mockLeaderboard.map(c => c.score)
      setStats({
        totalCandidates: mockLeaderboard.length,
        averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        topScore: Math.max(...scores)
      })
    } finally {
      setLoading(false)
    }
  }

  const getRankBadge = (rank) => {
    if (rank === 1) {
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-lg">
          <HiBadgeCheck className="w-6 h-6 text-white" />
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-lg">
          <HiBadgeCheck className="w-6 h-6 text-white" />
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg">
          <HiBadgeCheck className="w-6 h-6 text-white" />
        </div>
      )
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 bg-gray-200 rounded-full">
        <span className="text-sm font-bold text-gray-700">#{rank}</span>
      </div>
    )
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <DashboardLayout 
        sidebarContent={isEmployer ? <EmployerSidebar /> : <StudentSidebar />} 
        userType={isEmployer ? 'employer' : 'student'}
      >
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout 
      sidebarContent={isEmployer ? <EmployerSidebar /> : <StudentSidebar />} 
      userType={isEmployer ? 'employer' : 'student'}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-700 font-semibold mb-6 transition-colors"
        >
          <HiArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        <div className="bg-white rounded-3xl shadow-lg border-2 border-blue-400 p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full mb-4 shadow-lg">
              <HiBadgeCheck className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Job-Specific Leaderboard</h1>
            <p className="text-lg text-gray-700 font-semibold">{jobTitle}</p>
            <p className="text-md text-gray-500">{companyName}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-6 text-center">
              <HiChartBar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-blue-900">{stats.totalCandidates}</p>
              <p className="text-sm text-blue-700 font-medium">Total Candidates</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300 rounded-xl p-6 text-center">
              <HiStar className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-900">{stats.averageScore}</p>
              <p className="text-sm text-green-700 font-medium">Average Score</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl p-6 text-center">
              <HiBadgeCheck className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-yellow-900">{stats.topScore}</p>
              <p className="text-sm text-yellow-700 font-medium">Top Score</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-xl mb-8">
            <div className="flex items-start">
              <HiStar className="w-6 h-6 text-purple-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-purple-900 mb-2">How Rankings Work</h3>
                <p className="text-sm text-purple-800">
                  Candidates are ranked based on their AI screening interview performance for this specific job. 
                  The employer reviews this leaderboard to identify top performers for the next round. 
                  Higher scores increase your chances of being selected!
                </p>
              </div>
            </div>
          </div>

          {/* Leaderboard Table */}
          <div className="overflow-hidden border-2 border-gray-200 rounded-2xl">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-600 to-blue-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    Candidate
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                    Interview Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaderboard.map((candidate) => (
                  <tr 
                    key={candidate.id}
                    className={`${
                      candidate.isCurrentUser 
                        ? 'bg-blue-50 border-l-4 border-blue-500' 
                        : candidate.rank <= 3 
                          ? 'bg-gradient-to-r from-yellow-50 to-white' 
                          : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getRankBadge(candidate.rank)}
                        {candidate.rank <= 3 && (
                          <span className="ml-3 px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-full border border-yellow-300">
                            TOP {candidate.rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {candidate.candidateName}
                            {candidate.isCurrentUser && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-300">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-2xl font-bold ${getScoreColor(candidate.score)}`}>
                        {candidate.score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-900 font-medium">
                        {candidate.questionsAnswered}/8
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-600">
                        {formatDate(candidate.interviewDate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Priority Info */}
          <div className="mt-8 bg-green-50 border-l-4 border-green-500 p-6 rounded-r-xl">
            <div className="flex items-start">
              <HiBadgeCheck className="w-6 h-6 text-green-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-green-900 mb-2">Priority Selection Process</h3>
                <p className="text-sm text-green-800 mb-3">
                  The employer reviews this leaderboard to select candidates for the next round. 
                  Top performers are automatically prioritized:
                </p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>🥇 Top 3 candidates receive priority consideration</li>
                  <li>⭐ Scores above 85 are highlighted to the employer</li>
                  <li>📊 Rankings update in real-time as more candidates interview</li>
                  <li>🔔 You'll be notified if selected for the next round</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default JobLeaderboard
