import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiVideoCamera, HiMicrophone, HiDesktopComputer, HiClock, HiCheckCircle, HiXCircle } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import { useAuth } from '../context/AuthContext'
import { interviewService } from '../services/interviewService'

const InterviewStart = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState('technical')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium')
  const [permissions, setPermissions] = useState({
    camera: null,
    microphone: null
  })
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false)

  const interviewTypes = [
    {
      id: 'technical',
      name: 'Technical Interview',
      description: 'Coding problems, algorithms, and system design',
      icon: HiDesktopComputer,
      color: 'blue',
      duration: '45-60 min'
    },
    {
      id: 'hr',
      name: 'HR Interview',
      description: 'Behavioral questions and company culture fit',
      icon: HiVideoCamera,
      color: 'green',
      duration: '30-45 min'
    },
    {
      id: 'behavioral',
      name: 'Behavioral Interview',
      description: 'Situational questions and past experiences',
      icon: HiMicrophone,
      color: 'purple',
      duration: '30-45 min'
    }
  ]

  const roles = [
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Scientist',
    'Product Manager',
    'UI/UX Designer',
    'DevOps Engineer',
    'Mobile Developer'
  ]

  const difficulties = [
    { id: 'easy', name: 'Easy', description: 'Basic concepts and fundamentals' },
    { id: 'medium', name: 'Medium', description: 'Intermediate level questions' },
    { id: 'hard', name: 'Hard', description: 'Advanced concepts and challenges' }
  ]

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    setIsCheckingPermissions(true)
    try {
      // Check camera permission
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true })
      setPermissions(prev => ({ ...prev, camera: true }))
      cameraStream.getTracks().forEach(track => track.stop())

      // Check microphone permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermissions(prev => ({ ...prev, microphone: true }))
      micStream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('Permission error:', error)
      if (error.message.includes('video')) {
        setPermissions(prev => ({ ...prev, camera: false }))
      }
      if (error.message.includes('audio')) {
        setPermissions(prev => ({ ...prev, microphone: false }))
      }
    } finally {
      setIsCheckingPermissions(false)
    }
  }

  const handleStartInterview = async () => {
    if (!selectedRole) {
      alert('Please select a role')
      return
    }

    if (permissions.camera === false || permissions.microphone === false) {
      alert('Please allow camera and microphone permissions to start the interview')
      return
    }

    try {
      // Call backend API to start interview
      const response = await interviewService.startInterview({
        type: selectedType,
        role: selectedRole,
        difficulty: selectedDifficulty,
        duration: 30 // 30 minutes default
      })

      if (response.success && response.data) {
        // Navigate to live interview with interview data
        navigate('/student-dashboard/interview/live', {
          state: {
            interviewId: response.data.interview._id,
            type: selectedType,
            role: selectedRole,
            difficulty: selectedDifficulty,
            questions: response.data.questions || []
          }
        })
      }
    } catch (error) {
      console.error('Error starting interview:', error)
      // Fallback: navigate without backend data (use mock data)
      alert('Could not connect to interview service. Using practice mode.')
      navigate('/student-dashboard/interview/live', {
        state: {
          type: selectedType,
          role: selectedRole,
          difficulty: selectedDifficulty,
          practiceMode: true
        }
      })
    }
  }

  const getTypeColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 border-blue-300 hover:border-blue-500',
      green: 'bg-green-100 border-green-300 hover:border-green-500',
      purple: 'bg-purple-100 border-purple-300 hover:border-purple-500'
    }
    return colors[color] || colors.blue
  }

  const getTypeSelectedColor = (color) => {
    const colors = {
      blue: 'border-blue-600 bg-blue-50',
      green: 'border-green-600 bg-green-50',
      purple: 'border-purple-600 bg-purple-50'
    }
    return colors[color] || colors.blue
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Start Mock Interview</h1>
          <p className="text-gray-600">Practice with AI-powered interviews to improve your skills</p>
        </div>

        {/* Permission Check */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              permissions.camera === null ? 'border-gray-300 bg-gray-50' :
              permissions.camera ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}>
              <div className="flex items-center space-x-3">
                <HiVideoCamera className={`w-6 h-6 ${
                  permissions.camera === null ? 'text-gray-400' :
                  permissions.camera ? 'text-green-600' : 'text-red-600'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">Camera Access</p>
                  <p className="text-xs text-gray-500">Required for video recording</p>
                </div>
              </div>
              {permissions.camera === null ? (
                <span className="text-sm text-gray-500">Checking...</span>
              ) : permissions.camera ? (
                <HiCheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <HiXCircle className="w-6 h-6 text-red-600" />
              )}
            </div>

            <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
              permissions.microphone === null ? 'border-gray-300 bg-gray-50' :
              permissions.microphone ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}>
              <div className="flex items-center space-x-3">
                <HiMicrophone className={`w-6 h-6 ${
                  permissions.microphone === null ? 'text-gray-400' :
                  permissions.microphone ? 'text-green-600' : 'text-red-600'
                }`} />
                <div>
                  <p className="font-medium text-gray-900">Microphone Access</p>
                  <p className="text-xs text-gray-500">Required for audio recording</p>
                </div>
              </div>
              {permissions.microphone === null ? (
                <span className="text-sm text-gray-500">Checking...</span>
              ) : permissions.microphone ? (
                <HiCheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <HiXCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
          {(permissions.camera === false || permissions.microphone === false) && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Please allow camera and microphone permissions in your browser settings to continue.
              </p>
              <button
                onClick={checkPermissions}
                className="mt-2 text-sm text-blue-700 font-medium hover:text-blue-800"
              >
                Recheck Permissions
              </button>
            </div>
          )}
        </div>

        {/* Interview Type Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Interview Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {interviewTypes.map((type) => {
              const Icon = type.icon
              return (
                <div
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${
                    selectedType === type.id
                      ? getTypeSelectedColor(type.color)
                      : getTypeColor(type.color)
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <Icon className={`w-8 h-8 ${
                      selectedType === type.id ? 'text-' + type.color + '-700' : 'text-' + type.color + '-600'
                    }`} />
                    <span className="text-xs font-medium text-gray-600 flex items-center">
                      <HiClock className="w-3 h-3 mr-1" />
                      {type.duration}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{type.name}</h3>
                  <p className="text-sm text-gray-600">{type.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Role/Domain</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  selectedRole === role
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Level */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Difficulty Level</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {difficulties.map((diff) => (
              <div
                key={diff.id}
                onClick={() => setSelectedDifficulty(diff.id)}
                className={`cursor-pointer p-5 rounded-xl border-2 transition-all ${
                  selectedDifficulty === diff.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`font-semibold ${
                    selectedDifficulty === diff.id ? 'text-blue-700' : 'text-gray-900'
                  }`}>
                    {diff.name}
                  </h3>
                  {selectedDifficulty === diff.id && (
                    <HiCheckCircle className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600">{diff.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex items-center justify-center space-x-4 pb-8">
          <button
            onClick={() => navigate('/student-dashboard')}
            className="px-8 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartInterview}
            disabled={!selectedRole || permissions.camera === false || permissions.microphone === false || isCheckingPermissions}
            className={`px-8 py-3 font-semibold rounded-lg transition-colors ${
              !selectedRole || permissions.camera === false || permissions.microphone === false || isCheckingPermissions
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-700 text-white hover:bg-blue-800 shadow-lg'
            }`}
          >
            {isCheckingPermissions ? 'Checking Permissions...' : 'Start Interview'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default InterviewStart
