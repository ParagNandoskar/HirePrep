import React, { useState, useEffect } from 'react'
import { HiExternalLink, HiCalendar } from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'
import { candidatesAPI } from '../../services/api'

const UpcomingInterviews = () => {
  const { user } = useAuth()
  const [interviews, setInterviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const response = await candidatesAPI.getUpcomingInterviews()
        
        if (response.success && response.data) {
          setInterviews(response.data)
        }
      } catch (error) {
        console.error('Error fetching interviews:', error)
        setInterviews([])
      } finally {
        setIsLoading(false)
      }
    }

    if (user && user.role === 'student') {
      fetchInterviews()
    } else {
      setIsLoading(false)
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Interviews</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="bg-blue-100 rounded-xl p-4 h-40"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Interviews</h3>
      
      {interviews.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-3">
            <HiCalendar className="h-16 w-16 mx-auto" />
          </div>
          <p className="text-gray-500 text-base font-medium">No interviews scheduled</p>
          <p className="text-gray-400 text-sm mt-2">
            Your upcoming interviews will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {interviews.map((interview, index) => (
            <div 
              key={interview.id} 
              className={`${index === 0 ? 'bg-blue-200' : 'bg-white'} rounded-xl p-5 border ${index === 0 ? 'border-blue-300' : 'border-gray-200'} hover:shadow-md transition-all duration-200 relative`}
            >
              {/* External Link Icon */}
              <button 
                className="absolute top-4 right-4 text-gray-600 hover:text-blue-600 transition-colors p-1"
                aria-label="View interview details"
              >
                <HiExternalLink className="h-5 w-5" />
              </button>

              {/* Date */}
              <div className="text-base font-semibold text-gray-900 mb-3">
                {interview.date}
              </div>

              {/* Time */}
              <div className="text-3xl font-bold text-gray-900 mb-4">
                {interview.time}
              </div>

              {/* Company Badge */}
              <div className="mb-3">
                <span className="inline-flex px-4 py-1.5 text-white text-sm font-semibold rounded-full bg-blue-700 shadow-sm">
                  {interview.company}
                </span>
              </div>

              {/* Job Title */}
              <div className="text-sm font-medium text-gray-900 mb-2">
                {interview.jobTitle}
              </div>

              {/* Interview Type */}
              <div className="text-sm font-medium text-gray-700 mb-1">
                Type: {interview.type}
              </div>

              {/* Duration */}
              {interview.duration && (
                <div className="text-sm text-gray-600 mb-1">
                  Duration: {interview.duration} minutes
                </div>
              )}

              {/* Location or Meeting Link */}
              {interview.meetingLink && (
                <div className="text-sm text-blue-600 mb-1">
                  <a href={interview.meetingLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Join Meeting
                  </a>
                </div>
              )}
              {interview.location && !interview.meetingLink && (
                <div className="text-sm text-gray-600 mb-1">
                  Location: {interview.location}
                </div>
              )}

              {/* Status */}
              <div className="text-sm text-gray-600">
                Status: <span className="font-medium capitalize">{interview.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default UpcomingInterviews