import React, { useState, useEffect } from 'react'
import { HiExternalLink, HiCalendar } from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'

const UpcomingInterviews = () => {
  const { user } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        // For now, we'll simulate empty interviews since we don't have interview API yet
        // In a real app, you'd call: const response = await interviewAPI.getUpcomingInterviews()
        setInterviews([])
      } catch (error) {
        console.error('Error fetching interviews:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchInterviews()
    }
  }, [user])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Interviews</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-2 w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Interviews</h3>
      
      {interviews.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <HiCalendar className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No interviews scheduled</p>
          <p className="text-gray-400 text-xs mt-1">
            Your upcoming interviews will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatDate(interview.scheduledAt)}
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {formatTime(interview.scheduledAt)}
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-flex px-3 py-1 text-white text-sm font-medium rounded-full bg-blue-600">
                      {interview.company}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    {interview.type || 'Interview'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Status: {interview.status}
                  </div>
                </div>
                {/* FIX 2: Converted button to span with role="button" */}
                <span 
                  role="button" 
                  className="text-primary hover:text-secondary transition-colors p-2 cursor-pointer"
                >
                  <HiExternalLink className="h-5 w-5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UpcomingInterviews