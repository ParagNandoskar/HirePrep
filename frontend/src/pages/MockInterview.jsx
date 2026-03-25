import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiSparkles, HiVideoCamera, HiLightningBolt, HiChartBar, HiX } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'

const MockInterview = () => {
  const navigate = useNavigate()
  const [showSetupModal, setShowSetupModal] = useState(true)
  const [formData, setFormData] = useState({
    jobTitle: '',
    companyName: '',
    jobDescription: '',
    requiredSkills: ''
  })
  const [formError, setFormError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const startMockInterview = () => {
    if (!formData.jobTitle.trim() || !formData.jobDescription.trim()) {
      setFormError('Job title and job description are required.')
      return
    }

    const requiredSkills = formData.requiredSkills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean)

    navigate('/student-dashboard/ai-voice-interview', {
      state: {
        jobId: 'practice',
        applicationId: null,
        isJobApplication: false,
        type: 'technical',
        role: formData.jobTitle,
        jobTitle: formData.jobTitle,
        companyName: formData.companyName || 'Mock Company',
        jobDescription: formData.jobDescription,
        mockJobDetails: {
          jobTitle: formData.jobTitle,
          companyName: formData.companyName,
          jobDescription: formData.jobDescription,
          requiredSkills
        }
      }
    })
  }

  return (
    <DashboardLayout sidebarContent={<StudentSidebar />} userType="student">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-3xl border border-blue-200 bg-linear-to-r from-blue-50 via-indigo-50 to-sky-50 p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200 mb-4">
            <HiSparkles className="h-4 w-4" />
            Premium Feature
          </div>
          <h1 className="text-3xl font-black text-slate-900">Mock Interview</h1>
          <p className="text-slate-700 mt-2 max-w-2xl">
            Practice in a simulated interview environment before real screenings. Your mock sessions help you improve communication, structure, and confidence.
          </p>
          <button
            onClick={() => setShowSetupModal(true)}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
          >
            <HiVideoCamera className="h-5 w-5" />
            Configure Mock Interview
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <HiLightningBolt className="h-6 w-6 text-amber-500 mb-3" />
            <h3 className="font-bold text-slate-900">Realistic Pressure</h3>
            <p className="text-sm text-slate-600 mt-1">Train with timed prompts and interview-style question flow.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <HiChartBar className="h-6 w-6 text-emerald-600 mb-3" />
            <h3 className="font-bold text-slate-900">Actionable Feedback</h3>
            <p className="text-sm text-slate-600 mt-1">Get detailed performance insights available on paid plans.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <HiSparkles className="h-6 w-6 text-indigo-600 mb-3" />
            <h3 className="font-bold text-slate-900">Skill Building</h3>
            <p className="text-sm text-slate-600 mt-1">Practice repeatedly to sharpen structure and storytelling.</p>
          </div>
        </div>
      </div>

      {showSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-900">Set Up Mock Interview</h2>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <HiX className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Frontend Developer"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g. Acme Labs"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Required Skills (comma separated)</label>
                <input
                  type="text"
                  name="requiredSkills"
                  value={formData.requiredSkills}
                  onChange={handleChange}
                  placeholder="React, Node.js, MongoDB"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Job Description *</label>
                <textarea
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleChange}
                  placeholder="Paste a short role description and responsibilities"
                  rows={5}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}

              <button
                onClick={startMockInterview}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-700 text-white font-semibold hover:bg-blue-800 transition-colors"
              >
                <HiVideoCamera className="h-5 w-5" />
                Start Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default MockInterview