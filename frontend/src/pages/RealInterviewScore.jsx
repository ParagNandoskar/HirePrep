import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HiCheckCircle, HiStar } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'

const RealInterviewScore = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const {
    jobId,
    jobTitle,
    companyName,
    score = 0,
    questionsAnswered = 0
  } = location.state || {}

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <HiCheckCircle className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900 mb-2">Interview Completed</h1>
          <p className="text-slate-600">{jobTitle || 'Role'}</p>
          <p className="text-slate-500 mb-8">{companyName || 'Company'}</p>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 mb-8">
            <p className="text-sm font-semibold text-blue-700 mb-2">AGGREGATED REAL INTERVIEW SCORE</p>
            <p className="text-6xl font-bold text-blue-700">{Math.round(score)}</p>
            <p className="text-sm text-slate-600 mt-4">Questions answered: {questionsAnswered}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-amber-800">
              Detailed strengths and weaknesses are not shown for real company interviews. Use Mock Interviews for full analytics and coaching insights.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate('/student-dashboard/mock-interview')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800"
            >
              <HiStar className="w-5 h-5" />
              Take Mock Interview
            </button>
            {jobId && (
              <button
                onClick={() => navigate(`/student-dashboard/job-leaderboard/${jobId}`)}
                className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
              >
                View Leaderboard
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default RealInterviewScore
