import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { HiChartBar, HiCheckCircle, HiSparkles } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import geminiVoiceService from '../services/geminiVoiceService'

const MockInterviewResults = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { mockInterviewId } = location.state || {}

  const [loading, setLoading] = useState(true)
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        if (mockInterviewId) {
          const detail = await geminiVoiceService.getMockResultById(mockInterviewId)
          setSelected(detail?.data || detail)
        }

        const response = await geminiVoiceService.getMockResults()
        const items = response?.data?.interviews || []
        setList(items)
      } catch (error) {
        console.error('Failed to load mock interview analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [mockInterviewId])

  if (loading) {
    return (
      <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
        <div className="max-w-6xl mx-auto text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading mock analytics...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h1 className="text-3xl font-black text-slate-900">Results & Analytics</h1>
          <p className="text-slate-600 mt-2">Detailed analytics are shown for your mock interviews only.</p>
        </div>

        {list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <HiChartBar className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900">No Mock Interviews Yet</h3>
            <p className="text-slate-600 mt-2">Take a mock interview to unlock detailed analytics.</p>
            <button
              onClick={() => navigate('/student-dashboard/mock-interview')}
              className="mt-5 px-6 py-3 bg-blue-700 text-white font-semibold rounded-xl hover:bg-blue-800"
            >
              Start Mock Interview
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              {list.map((item) => (
                <button
                  key={item._id}
                  onClick={async () => {
                    const detail = await geminiVoiceService.getMockResultById(item._id)
                    setSelected(detail?.data || detail)
                  }}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                >
                  <p className="font-semibold text-slate-900">{item.jobTitle}</p>
                  <p className="text-sm text-slate-500">{item.companyName}</p>
                  <p className="text-lg font-bold text-blue-700 mt-2">{Math.round(item.score || 0)}%</p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
              {!selected ? (
                <p className="text-slate-600">Select a mock interview to view detailed analytics.</p>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{selected.jobContext?.jobTitle}</h2>
                    <p className="text-slate-600">{selected.jobContext?.companyName}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Metric label="Overall" value={selected.analysis?.overallScore} />
                    <Metric label="Communication" value={selected.analysis?.communicationScore} />
                    <Metric label="Technical" value={selected.analysis?.technicalScore} />
                    <Metric label="Problem Solving" value={selected.analysis?.problemSolvingScore} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="font-semibold text-emerald-900 mb-2">Strengths</p>
                      {(selected.analysis?.strengths || []).length === 0 ? (
                        <p className="text-sm text-emerald-800">No strengths captured.</p>
                      ) : (
                        <ul className="text-sm text-emerald-900 space-y-1">
                          {(selected.analysis?.strengths || []).map((s, i) => <li key={`${s}-${i}`}>• {s}</li>)}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="font-semibold text-amber-900 mb-2">Improvements</p>
                      {(selected.analysis?.improvements || []).length === 0 ? (
                        <p className="text-sm text-amber-800">No improvements captured.</p>
                      ) : (
                        <ul className="text-sm text-amber-900 space-y-1">
                          {(selected.analysis?.improvements || []).map((s, i) => <li key={`${s}-${i}`}>• {s}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900 mb-2">Insights</p>
                    <p className="text-sm text-slate-700">{selected.analysis?.insights || 'No insights available.'}</p>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <HiCheckCircle className="w-5 h-5 text-green-600" />
                    <span>Questions answered: {selected.questionsAnswered || 0}</span>
                    <HiSparkles className="w-5 h-5 text-indigo-600 ml-2" />
                    <span>Completed: {selected.completedAt ? new Date(selected.completedAt).toLocaleString() : '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

const Metric = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="text-2xl font-bold text-slate-900">{Math.round(value || 0)}</p>
  </div>
)

export default MockInterviewResults
