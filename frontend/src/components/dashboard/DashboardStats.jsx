import React, { useState, useEffect } from 'react'
import { candidatesAPI, jobsAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const DashboardStatsCard = ({ title, value, icon: IconComponent, bgColor = 'bg-white', textColor = 'text-gray-900' }) => {
  return (
    <div className={`${bgColor} p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm lg:text-base font-medium text-gray-600 mt-1">{title}</p>
        </div>
        {IconComponent && (
          <div className="shrink-0">
            <IconComponent className={`h-8 w-8 ${textColor}`} />
          </div>
        )}
      </div>
    </div>
  )
}

const DashboardStats = ({ userType = 'student' }) => {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (userType === 'student') {
          // Use the dedicated dashboard stats endpoint
          const statsResponse = await candidatesAPI.getDashboardStats()
          const statsData = statsResponse?.data || {}
          
          setStats([
            { title: 'Jobs Applied', value: (statsData.totalApplications || 0).toString() },
            { title: 'Interviews Scheduled', value: (statsData.interviewsScheduled || 0).toString() },
            { title: 'Resumes Uploaded', value: (statsData.resumesUploaded || 0).toString() },
            { title: 'Offers Received', value: (statsData.offersReceived || 0).toString() }
          ])
        } else {
          // Fetch employer stats
          const jobsResponse = await jobsAPI.getMyJobs()
          const jobs = jobsResponse?.data?.jobs || jobsResponse?.jobs || []
          
          let totalApplications = 0
          let interviewsScheduled = 0
          let candidatesHired = 0
          
          // Calculate aggregate stats from all jobs
          jobs.forEach(job => {
            totalApplications += job.applicationsCount || 0
            // These would need to be calculated from actual application data
            // For now, using placeholder logic
          })

          setStats([
            { title: 'Active Job Posts', value: jobs.length.toString() },
            { title: 'Total Applications', value: totalApplications.toString() },
            { title: 'Interviews Scheduled', value: '0' }, // Placeholder
            { title: 'Candidates Hired', value: '0' } // Placeholder
          ])
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        // Set default empty stats on error
        const defaultStats = userType === 'student' 
          ? [
              { title: 'Jobs Applied', value: '0' },
              { title: 'Interviews Scheduled', value: '0' },
              { title: 'Resumes Uploaded', value: '0' },
              { title: 'Offers Received', value: '0' }
            ]
          : [
              { title: 'Active Job Posts', value: '0' },
              { title: 'Total Applications', value: '0' },
              { title: 'Interviews Scheduled', value: '0' },
              { title: 'Candidates Hired', value: '0' }
            ]
        setStats(defaultStats)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchStats()
    }
  }, [user, userType])

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
      {stats.map((stat, index) => (
        <DashboardStatsCard
          key={index}
          title={stat.title}
          value={stat.value}
          bgColor={stat.bgColor}
          icon={stat.icon}
        />
      ))}
    </div>
  )
}

export default DashboardStats