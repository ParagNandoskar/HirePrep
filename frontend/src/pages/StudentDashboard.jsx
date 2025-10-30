import React from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import DashboardStats from '../components/dashboard/DashboardStats'
import RecentApplications from '../components/dashboard/RecentApplications'
import UpcomingInterviews from '../components/dashboard/UpcomingInterviews'

const StudentDashboard = () => {
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications Vs Time Chart</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">Chart Component</p>
              <p className="text-sm">Integration with chart library coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StudentDashboard