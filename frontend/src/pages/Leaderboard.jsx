import React, { useState, useEffect } from 'react'
import { HiStar, HiFire, HiTrendingUp, HiChevronRight, HiArrowLeft, HiRefresh } from 'react-icons/hi'
import { FaTrophy } from 'react-icons/fa'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { useAuth } from '../context/AuthContext'
import { analysisService } from '../services/analysisService'
import { apiService } from '../services/api'

const Leaderboard = () => {
  const { user } = useAuth()
  const [myInterviews, setMyInterviews] = useState([])
  const [selectedInterview, setSelectedInterview] = useState(null)
  const [jobLeaderboard, setJobLeaderboard] = useState([])
  const [myRankInJob, setMyRankInJob] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState('list')

  useEffect(() => {
    const fetchMyInterviews = async () => {
      try {
        setIsLoading(true)
        console.log('🔍 Fetching my completed interviews...')
        const response = await apiService.get('/applications')
        
        console.log('📊 Applications response:', response)
        
        if (response.success && response.data && response.data.applications) {
          const completedInterviews = response.data.applications.filter(
            app => app.interviewCompleted === true
          )
          
          console.log(`✅ Found ${completedInterviews.length} completed interviews out of ${response.data.applications.length} total applications`)
          console.log('📋 Interview details:', completedInterviews.map(i => ({
            job: i.jobId?.title,
            score: i.screeningScore,
            hasScore: !!i.screeningScore
          })))
          setMyInterviews(completedInterviews)
        } else {
          console.log('⚠️ No applications data in response')
          setMyInterviews([])
        }
      } catch (error) {
        console.error('❌ Error fetching interviews:', error)
        setMyInterviews([])
      } finally {
        setIsLoading(false)
      }
    }
    if (user) fetchMyInterviews()
  }, [user])

  const viewJobLeaderboard = async (interview) => {
    try {
      setIsLoading(true)
      setSelectedInterview(interview)
      console.log(`🏆 Fetching leaderboard for job: ${interview.jobId?.title}`)
      
      // Use new analysis service API
      const response = await analysisService.getJobLeaderboard(interview.jobId?._id || interview.jobId)
      
      if (response.success && response.data) {
        console.log('📊 Leaderboard data:', response.data)
        const candidates = response.data.candidates || []
        setJobLeaderboard(candidates)
        
        // Find my rank
        if (candidates.length > 0) {
          const myRank = candidates.findIndex(
            c => String(c.studentId) === String(user.id) ||
                 String(c.studentId?._id) === String(user.id)
          )
          
          if (myRank !== -1) {
            setMyRankInJob({
              rank: candidates[myRank].rank || myRank + 1,
              totalCandidates: candidates.length,
              score: candidates[myRank].overallScore || candidates[myRank].scores?.overallScore,
              percentile: candidates[myRank].percentile || Math.round((1 - myRank / candidates.length) * 100)
            })
          } else {
            // Current user not yet in list — show position from interview score
            setMyRankInJob(null)
          }
        }
      }
      setViewMode('leaderboard')
    } catch (error) {
      console.error('❌ Error fetching job leaderboard:', error)
      setJobLeaderboard([])
      setMyRankInJob(null)
      setViewMode('leaderboard')
    } finally {
      setIsLoading(false)
    }
  }

  const goBackToList = () => {
    setViewMode('list')
    setSelectedInterview(null)
    setJobLeaderboard([])
    setMyRankInJob(null)
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-50 border-green-200'
    if (score >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white'
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-white'
    if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
    return 'bg-gray-200 text-gray-700'
  }

  if (isLoading) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="animate-pulse">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-20 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          {viewMode === 'leaderboard' && (
            <button
              onClick={goBackToList}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <HiArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to My Interviews</span>
            </button>
          )}
          {viewMode === 'list' && (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center">
                <FaTrophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Interview Leaderboards</h2>
                <p className="text-gray-500 text-sm">View rankings for your completed interviews</p>
              </div>
            </div>
          )}
        </div>

        {viewMode === 'list' && (
          <>
            {myInterviews.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="text-gray-400 mb-4">
                  <FaTrophy className="mx-auto h-16 w-16" />
                </div>
                <p className="text-gray-600 text-lg font-medium">No Completed Interviews Yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Complete screening interviews to see leaderboards
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">My Completed Interviews</h3>
                  <p className="text-sm text-gray-500">Click on any interview to see rankings</p>
                </div>
                <div className="space-y-3">
                  {myInterviews.map((interview) => (
                    <button
                      key={interview._id}
                      onClick={() => viewJobLeaderboard(interview)}
                      className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-4 flex-1 text-left">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                          {interview.jobId?.title?.charAt(0) || 'J'}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-900">
                            {interview.jobId?.title || 'Job Title'}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                            <span className="font-medium">
                              {interview.jobId?.companyId?.companyName || 'Company'}
                            </span>
                            <span>•</span>
                            <span>Completed: {formatDate(interview.interviewCompletedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {interview.screeningScore ? (
                          <div className={`px-4 py-2 rounded-lg border-2 font-bold ${getScoreColor(interview.screeningScore)}`}>
                            Score: {interview.screeningScore}%
                          </div>
                        ) : (
                          <div className="px-4 py-2 rounded-lg border-2 bg-yellow-50 border-yellow-300 text-yellow-700 font-semibold">
                            ⚠️ No Score Available
                          </div>
                        )}
                        <div className="text-blue-600 group-hover:text-blue-700">
                          <HiChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {viewMode === 'leaderboard' && selectedInterview && (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedInterview.jobId?.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedInterview.jobId?.companyId?.companyName} • Completed: {formatDate(selectedInterview.interviewCompletedAt)}
                  </p>
                </div>
                {myRankInJob && (
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">#{myRankInJob.rank}</div>
                    <div className="text-sm text-gray-500">out of {myRankInJob.totalCandidates} candidates</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {jobLeaderboard.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="text-gray-400 mb-4">
                    <FaTrophy className="mx-auto h-16 w-16" />
                  </div>
                  <p className="text-gray-600 text-lg font-medium">Leaderboard Not Available Yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Interviews are still being processed. Rankings appear automatically once candidates complete their interviews.
                  </p>
                  {selectedInterview.screeningScore ? (
                    <>
                      <p className="text-gray-400 text-sm mt-1">
                        Your interview has been completed successfully with a score of <span className="font-semibold text-blue-600">{selectedInterview.screeningScore}%</span>
                      </p>
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 max-w-md mx-auto">
                        <p className="text-sm text-blue-800">
                          💡 <span className="font-semibold">Note:</span> Rankings will be available once the company reviews all candidates and generates the leaderboard.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 max-w-md mx-auto">
                      <p className="text-sm text-yellow-800">
                        ⚠️ <span className="font-semibold">No Score Available:</span> This interview was not properly analyzed. The interview may have been incomplete or there was an error during processing.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Candidate</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Percentile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {jobLeaderboard.map((candidate, index) => {
                        const isCurrentUser =
                          String(candidate.studentId) === String(user.id) ||
                          String(candidate.studentId?._id) === String(user.id)
                        const displayName = candidate.name || (isCurrentUser ? user?.name : null) || 'Anonymous'
                        const rank = candidate.rank || index + 1
                        const score = candidate.overallScore ?? candidate.scores?.overallScore ?? 0
                        const percentile = candidate.percentile ?? 0
                        return (
                          <tr key={candidate._id || index} className={`hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankBadgeColor(rank)} font-bold text-sm`}>
                                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                {candidate.avatar ? (
                                  <img
                                    src={candidate.avatar}
                                    alt={displayName}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${isCurrentUser ? 'bg-blue-500' : 'bg-gray-400'}`}>
                                    {displayName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                                    {isCurrentUser ? (
                                      <>
                                        <span>You</span>
                                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">You</span>
                                      </>
                                    ) : (
                                      <span>{displayName}</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {candidate.studentId?.profile?.university || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-lg font-bold ${score >= 85 ? 'text-green-600' : score >= 70 ? 'text-blue-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {Math.round(score)}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                                Top {percentile}%
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default Leaderboard
