import React, { useState, useEffect } from 'react'
import { HiCalendar, HiClock, HiVideoCamera, HiPhone, HiLocationMarker, HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { useAuth } from '../context/AuthContext'

const EmployerInterviewScheduling = () => {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [interviews, setInterviews] = useState([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)

  // Sample data for interviews
  const sampleInterviews = [
    {
      id: 1,
      candidate: {
        name: 'Ananya Sharma',
        role: 'Product Designer',
        avatar: null
      },
      date: new Date(2026, 0, 2, 10, 0), // Jan 2, 2026 10:00 AM
      duration: 60,
      type: 'Video Call',
      status: 'Scheduled',
      meetingLink: 'https://meet.google.com/abc-defg-hij'
    },
    {
      id: 2,
      candidate: {
        name: 'Rahul Verma',
        role: 'Frontend Developer',
        avatar: null
      },
      date: new Date(2026, 0, 2, 14, 0), // Jan 2, 2026 2:00 PM
      duration: 45,
      type: 'Video Call',
      status: 'Scheduled',
      meetingLink: 'https://zoom.us/j/123456789'
    },
    {
      id: 3,
      candidate: {
        name: 'Priya Mehta',
        role: 'UX Researcher',
        avatar: null
      },
      date: new Date(2026, 0, 3, 11, 30), // Jan 3, 2026 11:30 AM
      duration: 60,
      type: 'In-person',
      status: 'Scheduled',
      location: 'Office - Conference Room A'
    }
  ]

  useEffect(() => {
    setInterviews(sampleInterviews)
  }, [])

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const getInterviewsForDate = (date) => {
    return interviews.filter(interview => {
      const interviewDate = new Date(interview.date)
      return interviewDate.toDateString() === date.toDateString()
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const getStatusColor = (status) => {
    const colors = {
      'Scheduled': 'bg-blue-100 text-blue-800',
      'Completed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Pending': 'bg-yellow-100 text-yellow-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate)
  const totalCells = Math.ceil((daysInMonth + startingDayOfWeek) / 7) * 7

  return (
    <DashboardLayout 
      sidebarContent={<EmployerSidebar />} 
      userType="employer"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Interview Scheduling</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage and schedule interviews with candidates
            </p>
          </div>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-6 py-2.5 bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
          >
            + Schedule New Interview
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Today's Interviews</p>
                <p className="text-3xl font-bold text-gray-900">3</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <HiCalendar className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">This Week</p>
                <p className="text-3xl font-bold text-gray-900">12</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <HiClock className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending Confirmations</p>
                <p className="text-3xl font-bold text-gray-900">5</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-xl">
                <HiVideoCamera className="w-6 h-6 text-yellow-700" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">45</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <HiPhone className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar View */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">{getMonthName(currentDate)}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <HiChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => changeMonth(1)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <HiChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: totalCells }, (_, index) => {
                  const dayNumber = index - startingDayOfWeek + 1
                  const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
                  const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber)
                  const isToday = date.toDateString() === new Date().toDateString()
                  const isSelected = date.toDateString() === selectedDate.toDateString()
                  const dayInterviews = isValidDay ? getInterviewsForDate(date) : []
                  const hasInterviews = dayInterviews.length > 0

                  return (
                    <div
                      key={index}
                      onClick={() => isValidDay && setSelectedDate(date)}
                      className={`
                        aspect-square p-2 border border-gray-200 rounded-lg cursor-pointer transition-all
                        ${!isValidDay ? 'bg-gray-50 cursor-not-allowed' : ''}
                        ${isToday ? 'border-blue-500 bg-blue-50' : ''}
                        ${isSelected ? 'bg-blue-700 text-white' : ''}
                        ${hasInterviews && !isSelected ? 'bg-green-50 border-green-200' : ''}
                        hover:border-blue-400 hover:shadow-sm
                      `}
                    >
                      {isValidDay && (
                        <div className="h-full flex flex-col items-center justify-between">
                          <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                            {dayNumber}
                          </span>
                          {hasInterviews && (
                            <div className="flex space-x-0.5">
                              {dayInterviews.slice(0, 3).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-600'}`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center space-x-6 mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-50 border border-blue-500 rounded"></div>
                  <span className="text-xs text-gray-600">Today</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                  <span className="text-xs text-gray-600">Has Interviews</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-700 rounded"></div>
                  <span className="text-xs text-gray-600">Selected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Interviews */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Interviews on {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h3>

              {getInterviewsForDate(selectedDate).length === 0 ? (
                <div className="text-center py-8">
                  <HiCalendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No interviews scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getInterviewsForDate(selectedDate).map((interview) => (
                    <div
                      key={interview.id}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-700">
                              {interview.candidate.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {interview.candidate.name}
                            </h4>
                            <p className="text-xs text-gray-500">{interview.candidate.role}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <HiClock className="w-4 h-4 mr-2" />
                          <span>{formatTime(interview.date)} ({interview.duration} min)</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          {interview.type === 'Video Call' ? (
                            <>
                              <HiVideoCamera className="w-4 h-4 mr-2" />
                              <span>Video Call</span>
                            </>
                          ) : (
                            <>
                              <HiLocationMarker className="w-4 h-4 mr-2" />
                              <span>{interview.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(interview.status)}`}>
                          {interview.status}
                        </span>
                        <div className="flex space-x-2">
                          <button className="text-xs text-blue-700 hover:text-blue-800 font-medium">
                            Edit
                          </button>
                          <button className="text-xs text-red-600 hover:text-red-700 font-medium">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-3 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-100 transition-colors text-left">
                  📧 Send Interview Reminders
                </button>
                <button className="w-full px-4 py-3 bg-green-50 text-green-700 text-sm font-semibold rounded-lg hover:bg-green-100 transition-colors text-left">
                  📊 View Interview Analytics
                </button>
                <button className="w-full px-4 py-3 bg-purple-50 text-purple-700 text-sm font-semibold rounded-lg hover:bg-purple-100 transition-colors text-left">
                  ⚙️ Interview Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EmployerInterviewScheduling
