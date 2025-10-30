import React, { useState, useEffect } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { HiExternalLink, HiPlus, HiTrendingUp, HiUsers, HiCalendar, HiCheckCircle } from 'react-icons/hi'
import { jobsAPI, companiesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui'

const EmployerDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [dashboardData, setDashboardData] = useState({
    stats: {
      activeJobs: 0,
      totalApplications: 0,
      interviewsScheduled: 0,
      candidatesHired: 0
    },
    recentJobs: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Load dashboard stats from dedicated endpoint
      const [statsResponse, jobsResponse] = await Promise.all([
        companiesAPI.getDashboardStats(),
        jobsAPI.getMyJobs({ limit: 10 })
      ])
      
      const stats = statsResponse?.data || {}
      const jobs = jobsResponse?.jobs || []
      
      setDashboardData({
        stats: {
          activeJobs: stats.activeJobs || 0,
          totalApplications: stats.totalApplications || 0,
          interviewsScheduled: stats.interviewsScheduled || 0,
          candidatesHired: stats.candidatesHired || 0
        },
        recentJobs: jobs.slice(0, 7) // Show last 7 jobs
      })
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      // Set default values on error
      setDashboardData({
        stats: {
          activeJobs: 0,
          totalApplications: 0,
          interviewsScheduled: 0,
          candidatesHired: 0
        },
        recentJobs: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Active Jobs',
      value: dashboardData.stats.activeJobs.toString(),
      bgColor: 'bg-white',
      icon: HiTrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Total Applications',
      value: dashboardData.stats.totalApplications.toString(),
      bgColor: 'bg-white',
      icon: HiUsers,
      color: 'text-green-600'
    },
    {
      title: 'Interviews Scheduled',
      value: dashboardData.stats.interviewsScheduled.toString(),
      bgColor: 'bg-white',
      icon: HiCalendar,
      color: 'text-yellow-600'
    },
    {
      title: 'Candidates Hired',
      value: dashboardData.stats.candidatesHired.toString(),
      bgColor: 'bg-white',
      icon: HiCheckCircle,
      color: 'text-purple-600'
    }
  ]

  return (
    <DashboardLayout 
      sidebarContent={<EmployerSidebar />} 
      userType="employer"
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {user?.name || 'there'}!
          </h1>
          <p className="text-blue-100">
            Here's an overview of your recruitment activity
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <div key={index} className={`${stat.bgColor} rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-800 mb-2">{stat.value}</div>
                    <div className="text-sm text-gray-600 font-medium">{stat.title}</div>
                  </div>
                  <IconComponent className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Job Postings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Job Postings</h3>
              <Link 
                to="/employer-dashboard/job-management"
                className="flex items-center text-primary hover:text-secondary transition-colors text-sm font-medium"
              >
                <HiPlus className="w-4 h-4 mr-1" />
                Post New Job
              </Link>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dashboardData.recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiTrendingUp className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No jobs posted yet</h4>
                <p className="text-gray-500 mb-4">Start by posting your first job to attract candidates</p>
                {/* FIX APPLIED HERE: Used custom Button component */}
                <Button 
                  onClick={() => navigate("/employer-dashboard/job-management")}
                  variant="primary"
                  className="inline-flex items-center"
                >
                  <HiPlus className="w-4 h-4 mr-2" />
                  Post Your First Job
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Job Title</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Applications</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Date Posted</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dashboardData.recentJobs.map((job, index) => (
                      <tr key={job._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{job.title}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{job.applicationsCount || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {job.status === 'active' ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link 
                            to="/employer-dashboard/job-management"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <HiExternalLink className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Recent Applications - Placeholder for now */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Applications</h3>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HiUsers className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h4>
              <p className="text-gray-500">Applications will appear here once candidates start applying to your jobs</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              to="/employer-dashboard/job-management"
              className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
                <HiPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-blue-600">Post New Job</h4>
                <p className="text-sm text-gray-500">Create a new job posting</p>
              </div>
            </Link>
            
            <Link 
              to="/employer-dashboard/profile"
              className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-4">
                <HiUsers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-green-600">Update Profile</h4>
                <p className="text-sm text-gray-500">Manage company information</p>
              </div>
            </Link>
            
            <div className="flex items-center p-4 bg-purple-50 rounded-xl opacity-75">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-4">
                <HiCalendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-medium text-gray-700">Schedule Interviews</h4>
                <p className="text-sm text-gray-500">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EmployerDashboard
