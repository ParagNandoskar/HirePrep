import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import DashboardStats from '../components/dashboard/DashboardStats'
import RecentApplications from '../components/dashboard/RecentApplications'
import { candidatesAPI } from '../services/api'

const StudentDashboard = () => {
  const navigate = useNavigate()
  const [chartData, setChartData] = useState([])
  const [isLoadingChart, setIsLoadingChart] = useState(true)
  const [subscriptionPlan, setSubscriptionPlan] = useState('free')

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Fetch applications with date grouping
        const response = await candidatesAPI.getApplications()
        
        if (response.success && response.data?.applications) {
          // Process data for chart - group by month
          const groupedData = processApplicationsForChart(response.data.applications)
          setChartData(groupedData)
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
        // Set empty data if API fails
        setChartData([])
      } finally {
        setIsLoadingChart(false)
      }
    }

    fetchChartData()
  }, [])

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await candidatesAPI.getProfile()
        const profile = response?.data || response
        const plan = profile?.subscription?.plan || 'free'
        setSubscriptionPlan(plan)
      } catch (error) {
        console.error('Error fetching subscription plan:', error)
      }
    }

    fetchSubscription()
  }, [])

  const canUseMockInterviews = subscriptionPlan === 'pro' || subscriptionPlan === 'elite'

  const processApplicationsForChart = (applications) => {
    if (!applications || applications.length === 0) {
      return []
    }

    const dateCounts = {}
    
    applications.forEach(app => {
      const date = new Date(app.appliedAt || app.createdAt)
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      if (!dateCounts[dateKey]) {
        dateCounts[dateKey] = 0
      }
      dateCounts[dateKey] += 1
    })

    // Convert to array sorted by date
    const sortedDates = Object.keys(dateCounts).sort((a, b) => {
      return new Date(a) - new Date(b)
    })

    // Create cumulative data
    let cumulative = 0
    return sortedDates.map(dateKey => {
      cumulative += dateCounts[dateKey]
      return {
        name: dateKey,
        'Applications': cumulative
      }
    })
  }

  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <DashboardStats userType="student" />
        
        {/* Main Content Grid */}
        <div>
          <RecentApplications />
        </div>

        {/* Mock Interview Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mock Interview Practice</h3>
              <p className="text-sm text-gray-600 mt-1">
                {canUseMockInterviews
                  ? 'Practice with AI-powered mock interviews to improve before real screenings.'
                  : 'Mock interviews are available on Pro and Elite plans.'}
              </p>
            </div>

            {canUseMockInterviews ? (
              <button
                onClick={() => navigate('/student-dashboard/mock-interview')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-700 hover:to-indigo-700"
              >
                Start Mock Interview
              </button>
            ) : (
              <button
                onClick={() => navigate('/student-dashboard/subscription')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-blue-300 text-blue-700 font-semibold hover:bg-blue-50"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* Applications vs Time Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Applications Vs Time Chart</h3>
          {isLoadingChart ? (
            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center animate-pulse">
              <p className="text-gray-400">Loading chart...</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 mb-2">No application data yet</p>
                <p className="text-gray-400 text-sm">Start applying to jobs to see your progress</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="Applications"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorApplications)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StudentDashboard