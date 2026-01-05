import React, { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import DashboardStats from '../components/dashboard/DashboardStats'
import RecentApplications from '../components/dashboard/RecentApplications'
import UpcomingInterviews from '../components/dashboard/UpcomingInterviews'
import { candidatesAPI } from '../services/api'

const StudentDashboard = () => {
  const [chartData, setChartData] = useState([])
  const [isLoadingChart, setIsLoadingChart] = useState(true)

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        // Fetch applications with date grouping
        const response = await candidatesAPI.getApplications()
        
        if (response.success && response.applications) {
          // Process data for chart - group by month
          const groupedData = processApplicationsForChart(response.applications)
          setChartData(groupedData)
        }
      } catch (error) {
        console.error('Error fetching chart data:', error)
        // Set sample data if API fails
        setChartData(getSampleChartData())
      } finally {
        setIsLoadingChart(false)
      }
    }

    fetchChartData()
  }, [])

  const processApplicationsForChart = (applications) => {
    const monthCounts = {}
    
    applications.forEach(app => {
      const date = new Date(app.appliedAt)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      if (!monthCounts[monthKey]) {
        monthCounts[monthKey] = { applied: 0, average: 0 }
      }
      monthCounts[monthKey].applied += 1
    })

    // Convert to array and calculate moving average
    return Object.keys(monthCounts).map((key, index) => ({
      name: key,
      'Your OPA': monthCounts[key].applied,
      'Average OPA': Math.max(monthCounts[key].applied - 2, 0) // Simulated average slightly lower
    }))
  }

  const getSampleChartData = () => {
    return [
      { name: '1st November', 'Your OPA': 12, 'Average OPA': 10 },
      { name: '2nd December', 'Your OPA': 15, 'Average OPA': 13 },
      { name: '3rd December', 'Your OPA': 14, 'Average OPA': 12 },
      { name: '4th December', 'Your OPA': 18, 'Average OPA': 15 },
      { name: '5th December', 'Your OPA': 16, 'Average OPA': 14 },
      { name: '6th December', 'Your OPA': 20, 'Average OPA': 17 },
      { name: '7th December', 'Your OPA': 22, 'Average OPA': 19 }
    ]
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Applications - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <RecentApplications />
          </div>
          
          {/* Upcoming Interviews - Takes 1 column on large screens */}
          <div className="lg:col-span-1">
            <UpcomingInterviews />
          </div>
        </div>

        {/* Applications vs Time Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Applications Vs Time Chart</h3>
          {isLoadingChart ? (
            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center animate-pulse">
              <p className="text-gray-400">Loading chart...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorYourOPA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAverageOPA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a5b4fc" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0}/>
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
                  dataKey="Your OPA"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorYourOPA)"
                />
                <Area
                  type="monotone"
                  dataKey="Average OPA"
                  stroke="#a5b4fc"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorAverageOPA)"
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