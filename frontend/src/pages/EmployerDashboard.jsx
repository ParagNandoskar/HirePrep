import React, { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
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
    recentJobs: [],
    recentApplications: [],
    applicationsByStatus: []
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
      // API returns { data: { jobs: [...], pagination: {...} } }
      const jobs = jobsResponse?.data?.jobs || jobsResponse?.jobs || []
      
      // Get real applications data
      const recentApplications = stats.recentApplications || []
      
      // Get real applications by status data
      const statusData = stats.applicationsByStatus || []
      
      setDashboardData({
        stats: {
          activeJobs: stats.activeJobs || 0,
          totalApplications: stats.totalApplications || 0,
          interviewsScheduled: stats.interviewsScheduled || 0,
          candidatesHired: stats.candidatesHired || 0
        },
        recentJobs: jobs.slice(0, 7),
        recentApplications: recentApplications,
        applicationsByStatus: statusData
      })
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setDashboardData({
        stats: {
          activeJobs: 0,
          totalApplications: 0,
          interviewsScheduled: 0,
          candidatesHired: 0
        },
        recentJobs: [],
        recentApplications: [],
        applicationsByStatus: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const statsCards = [
    {
      title: 'Jobs Posted',
      value: dashboardData.stats.activeJobs.toString(),
      bgColor: 'bg-white',
      icon: HiTrendingUp,
      color: 'text-blue-600'
    },
    {
      title: 'Active Applications',
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
      title: 'Hires Completed',
      value: dashboardData.stats.candidatesHired.toString(),
      bgColor: 'bg-white',
      icon: HiCheckCircle,
      color: 'text-purple-600'
    }
  ]

  const getStatusColor = (status) => {
    const colors = {
      'Shortlisted': 'bg-green-100 text-green-800 border-green-200',
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'Reviewing': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

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
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Applicants</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Date Posted</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {dashboardData.recentJobs.map((job) => (
                      <tr key={job._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{job.title}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{job.applicationsCount || 0}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status === 'active' ? 'Open' : 'Closed'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {new Date(job.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link 
                            to={`/employer-dashboard/job/${job._id}`}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <HiExternalLink className="w-5 h-5" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Recent Applications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Applications</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dashboardData.recentApplications.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HiUsers className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h4>
                <p className="text-gray-500">Applications will appear here once candidates start applying</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dashboardData.recentApplications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      {/* External Link Icon */}
                      <button className="text-gray-400 hover:text-blue-600 transition-colors">
                        <HiExternalLink className="w-5 h-5" />
                      </button>

                      {/* Candidate Info */}
                      <div>
                        <h4 className="font-semibold text-gray-900 text-base mb-1">{application.candidateName}</h4>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold text-white bg-blue-700 rounded-full">
                            {application.role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status and Score */}
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(application.status)}`}>
                        {application.status}
                      </span>
                      <span className="text-sm font-medium text-gray-600">Score: {application.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Applications by Status Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Applications by Status</h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : dashboardData.applicationsByStatus.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">No application data available</p>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.applicationsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.applicationsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default EmployerDashboard
