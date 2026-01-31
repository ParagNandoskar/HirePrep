import React, { useState, useEffect } from 'react'
import { HiSearch, HiChevronDown } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import { jobsAPI, resumeAPI } from '../services/api'
import { applicationsService } from '../services/applicationsService'
import { useAuth } from '../context/AuthContext'

const EmployerApplicationsReview = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [filteredApplications, setFilteredApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobs, setJobs] = useState([])
  const [selectedApplicationIds, setSelectedApplicationIds] = useState([])
  const [filters, setFilters] = useState({
    status: [],
    scoreRange: [0, 100],
    dateApplied: '',
    educationLevel: '',
    experienceLevel: '',
    skills: []
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    if (selectedJob) {
      fetchApplications()
    }
  }, [selectedJob])

  useEffect(() => {
    applyFilters()
  }, [filters, applications])

  const fetchJobs = async () => {
    try {
      const response = await jobsAPI.getMyJobs({ limit: 100 })
      const jobsList = response?.data?.jobs || response?.jobs || []
      setJobs(jobsList)
      
      // Select first job with applications, or just first job if none have applications
      if (jobsList.length > 0) {
        const jobWithApps = jobsList.find(job => job.applicationsCount > 0) || jobsList[0]
        setSelectedJob(jobWithApps)
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    }
  }

  const fetchApplications = async () => {
    if (!selectedJob || !selectedJob._id) {
      setApplications([])
      setFilteredApplications([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      
      console.log('🔍 Fetching applications for job:', selectedJob._id, selectedJob.title)
      
      // Build params object
      const params = {
        page: 1,
        limit: 100
      };
      
      // Only add status filter if it's actually set
      if (filters.status && filters.status.length > 0) {
        params.status = filters.status.join(',');
      }
      
      // Fetch applications for selected job
      const response = await jobsAPI.getJobApplications(selectedJob._id, params)

      console.log('📡 API Response:', response)

      // API returns { success: true, data: { applications: [...] } }
      const applicationsData = response?.data?.applications || response?.applications || []
      
      console.log('📊 Applications data:', applicationsData)
      console.log('📈 Applications count:', applicationsData.length)
      
      // Log first application to see its structure
      if (applicationsData.length > 0) {
        console.log('🔍 Sample application structure:', JSON.stringify(applicationsData[0], null, 2))
      }
      
      // Map backend data to frontend format
      const mappedApplications = applicationsData.map(app => ({
        id: app._id,
        candidate: {
          name: app.candidateId?.name || 'Unknown',
          email: app.candidateId?.email || 'N/A',
          education: app.candidateId?.profile?.degree || 'N/A',
          experience: app.candidateId?.profile?.graduationYear ? `${new Date().getFullYear() - app.candidateId.profile.graduationYear} Years` : 'N/A'
        },
        role: selectedJob.title,
        scores: {
          overall: app.aiAnalysis?.scores?.overall || app.interviewScore || app.screeningScore || 0,
          resume: app.screeningScore || 0,
          interview: app.interviewScore || 0,
          communication: app.aiAnalysis?.scores?.communication || 0
        },
        aiAnalysis: app.aiAnalysis || {},
        interviewTranscript: app.interviewTranscript || [],
        candidateData: app.candidateId,
        status: formatStatus(app.status),
        appliedDate: new Date(app.appliedAt || app.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        jobId: selectedJob._id,
        rawStatus: app.status
      }))

      console.log('✅ Mapped applications:', mappedApplications)

      setApplications(mappedApplications)
      setFilteredApplications(mappedApplications)
    } catch (error) {
      console.error('Error fetching applications:', error)
      setApplications([])
      setFilteredApplications([])
    } finally {
      setIsLoading(false)
    }
  }

  const formatStatus = (status) => {
    const statusMap = {
      'applied': 'Pending',
      'under-review': 'Pending',
      'screening': 'Pending',
      'assessment': 'Pending',
      'interview-scheduled': 'Interviewed',
      'interviewing': 'Interviewed',
      'interviewed': 'Interviewed',
      'final-round': 'Interviewed',
      'decision-pending': 'Pending',
      'offer-extended': 'Shortlisted',
      'offer-accepted': 'Hired',
      'hired': 'Hired',
      'rejected': 'Rejected',
      'withdrawn': 'Rejected'
    }
    return statusMap[status] || 'Pending'
  }

  const applyFilters = () => {
    let filtered = [...applications]

    // Filter by status
    if (filters.status.length > 0) {
      filtered = filtered.filter(app => filters.status.includes(app.status))
    }

    // Filter by score range
    filtered = filtered.filter(app => 
      app.scores.overall >= filters.scoreRange[0] && 
      app.scores.overall <= filters.scoreRange[1]
    )

    setFilteredApplications(filtered)
  }

  const handleStatusFilter = (status) => {
    const updatedStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status]
    
    setFilters({ ...filters, status: updatedStatus })
  }

  const getScoreColor = (score) => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200'
    if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-red-100 text-red-800 border-red-200'
  }

  const getStatusColor = (status) => {
    const colors = {
      'Shortlisted': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Interviewed': 'bg-blue-100 text-blue-800',
      'Hired': 'bg-purple-100 text-purple-800',
      'Rejected': 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const generateInterviewReport = (application) => {
    const report = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Report - ${application.candidate.name}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
      background: #f8f9fa;
    }
    .report-container {
      background: white;
      padding: 40px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0 0 10px 0;
      font-size: 32px;
    }
    .header .subtitle {
      color: #6b7280;
      font-size: 16px;
    }
    .section {
      margin: 30px 0;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    .section-title {
      color: #1e40af;
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 15px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 15px 0;
    }
    .info-item {
      padding: 12px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-value {
      color: #111827;
      font-size: 16px;
      margin-top: 5px;
    }
    .scores-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .score-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .score-card.green {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    }
    .score-card.blue {
      background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
    }
    .score-card.orange {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .score-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .score-value {
      font-size: 36px;
      font-weight: 700;
    }
    .qa-container {
      margin: 20px 0;
    }
    .qa-item {
      margin: 20px 0;
      padding: 20px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .question {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
    }
    .question-label {
      font-weight: 700;
      color: #1e40af;
      font-size: 13px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .question-text {
      color: #1f2937;
      font-size: 16px;
      line-height: 1.6;
    }
    .answer {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 15px;
      border-radius: 6px;
    }
    .answer-label {
      font-weight: 700;
      color: #047857;
      font-size: 13px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .answer-text {
      color: #1f2937;
      font-size: 15px;
      line-height: 1.7;
    }
    .list-items {
      list-style: none;
      padding: 0;
    }
    .list-items li {
      padding: 10px 15px;
      margin: 8px 0;
      background: white;
      border-left: 3px solid #10b981;
      border-radius: 4px;
    }
    .list-items.improvements li {
      border-left-color: #f59e0b;
    }
    .insight-box {
      background: #fef3c7;
      border: 2px solid #f59e0b;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .recommendation-box {
      background: #d1fae5;
      border: 2px solid #10b981;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .timestamp {
      color: #6b7280;
      font-size: 12px;
      margin-top: 8px;
      font-style: italic;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 13px;
    }
    @media print {
      body { background: white; padding: 0; }
      .report-container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      <h1>📋 Interview Analysis Report</h1>
      <div class="subtitle">
        Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>

    <!-- Candidate Information -->
    <div class="section">
      <h2 class="section-title">👤 Candidate Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Full Name</div>
          <div class="info-value">${application.candidate.name}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${application.candidate.email}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Position Applied</div>
          <div class="info-value">${application.role}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Education</div>
          <div class="info-value">${application.candidate.education}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Experience</div>
          <div class="info-value">${application.candidate.experience}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Application Date</div>
          <div class="info-value">${application.appliedDate}</div>
        </div>
      </div>
    </div>

    <!-- Performance Scores -->
    <div class="section">
      <h2 class="section-title">📊 Performance Scores</h2>
      <div class="scores-grid">
        <div class="score-card">
          <div class="score-label">Overall Score</div>
          <div class="score-value">${application.scores.overall}%</div>
        </div>
        <div class="score-card green">
          <div class="score-label">Resume Score</div>
          <div class="score-value">${application.scores.resume}%</div>
        </div>
        <div class="score-card blue">
          <div class="score-label">Interview Score</div>
          <div class="score-value">${application.scores.interview}%</div>
        </div>
        <div class="score-card orange">
          <div class="score-label">Communication</div>
          <div class="score-value">${application.scores.communication}%</div>
        </div>
      </div>
      ${application.aiAnalysis?.scores ? `
      <div class="info-grid" style="margin-top: 20px;">
        ${Object.entries(application.aiAnalysis.scores)
          .filter(([key]) => !['overall', 'communication', 'resume', 'interview'].includes(key))
          .map(([key, value]) => `
            <div class="info-item">
              <div class="info-label">${key.replace(/([A-Z])/g, ' $1').trim()}</div>
              <div class="info-value">${value}%</div>
            </div>
          `).join('')}
      </div>
      ` : ''}
    </div>

    <!-- AI Analysis -->
    ${application.aiAnalysis?.strengths?.length > 0 ? `
    <div class="section">
      <h2 class="section-title">✨ Key Strengths</h2>
      <ul class="list-items">
        ${application.aiAnalysis.strengths.map(strength => `<li>✓ ${strength}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${application.aiAnalysis?.improvements?.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📈 Areas for Improvement</h2>
      <ul class="list-items improvements">
        ${application.aiAnalysis.improvements.map(improvement => `<li>→ ${improvement}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    ${application.aiAnalysis?.insights ? `
    <div class="section">
      <h2 class="section-title">💡 AI Insights</h2>
      <div class="insight-box">
        <p style="margin: 0; font-size: 15px; line-height: 1.7;">${application.aiAnalysis.insights}</p>
      </div>
    </div>
    ` : ''}

    ${application.aiAnalysis?.recommendation ? `
    <div class="section">
      <h2 class="section-title">🎯 Final Recommendation</h2>
      <div class="recommendation-box">
        <p style="margin: 0; font-size: 15px; line-height: 1.7; font-weight: 600;">${application.aiAnalysis.recommendation}</p>
      </div>
    </div>
    ` : ''}

    <!-- Interview Q&A -->
    ${application.interviewTranscript?.length > 0 ? `
    <div class="section">
      <h2 class="section-title">💬 Interview Questions & Answers</h2>
      <div class="qa-container">
        ${application.interviewTranscript.map((entry, index) => {
          if (entry.type === 'question') {
            const nextEntry = application.interviewTranscript[index + 1];
            return `
              <div class="qa-item">
                <div class="question">
                  <div class="question-label">Question ${entry.questionNumber || Math.floor(index / 2) + 1}</div>
                  <div class="question-text">${entry.content}</div>
                  ${entry.timestamp ? `<div class="timestamp">${new Date(entry.timestamp).toLocaleString()}</div>` : ''}
                </div>
                ${nextEntry && nextEntry.type === 'answer' ? `
                <div class="answer">
                  <div class="answer-label">Candidate's Response</div>
                  <div class="answer-text">${nextEntry.content}</div>
                  ${nextEntry.timestamp ? `<div class="timestamp">${new Date(nextEntry.timestamp).toLocaleString()}</div>` : ''}
                </div>
                ` : ''}
              </div>
            `;
          }
          return '';
        }).join('')}
      </div>
      <div class="info-item" style="margin-top: 20px;">
        <div class="info-label">Total Questions Answered</div>
        <div class="info-value">${application.aiAnalysis?.questionsAnswered || Math.floor(application.interviewTranscript.length / 2)} Questions</div>
      </div>
    </div>
    ` : ''}

    <div class="footer">
      <p>This report was generated automatically by HirePrep AI Interview System</p>
      <p>Report ID: ${application.id} | Status: ${application.status}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
    
    return report;
  };

  const handleBulkAction = async (action) => {
    if (selectedApplicationIds.length === 0) {
      alert('Please select at least one application')
      return
    }

    const selectedApplications = filteredApplications.filter(app => 
      selectedApplicationIds.includes(app.id)
    )

    try {
      if (action === 'shortlist' || action === 'reject') {
        const status = action === 'shortlist' ? 'shortlisted' : 'rejected'
        
        await applicationsService.bulkUpdateStatus(selectedApplicationIds, status)
        
        // Refresh applications list
        if (selectedJob) {
          fetchApplications(selectedJob._id)
        }
        setSelectedApplicationIds([])
        alert(`${selectedApplications.length} application(s) ${status}`)
      } else if (action === 'export') {
        // Export detailed interview reports
        if (selectedApplications.length === 1) {
          // Single report - generate and download HTML
          const report = generateInterviewReport(selectedApplications[0]);
          const blob = new Blob([report], { type: 'text/html;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `Interview_Report_${selectedApplications[0].candidate.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          // Multiple reports - create a combined document
          const combinedReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Reports - ${selectedJob?.title || 'Multiple Candidates'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .report { page-break-after: always; margin-bottom: 60px; }
    .separator { border-top: 5px solid #2563eb; margin: 40px 0; }
    @media print { .report { page-break-after: always; } }
  </style>
</head>
<body>
  <h1 style="text-align: center; color: #2563eb;">Batch Interview Reports</h1>
  <p style="text-align: center; color: #6b7280;">Job Position: ${selectedJob?.title || 'N/A'} | Generated: ${new Date().toLocaleString()}</p>
  <div class="separator"></div>
  ${selectedApplications.map((app, index) => `
    <div class="report">
      ${generateInterviewReport(app).replace('<!DOCTYPE html>', '').replace(/<html>.*?<body>/s, '').replace('</body></html>', '')}
      ${index < selectedApplications.length - 1 ? '<div class="separator"></div>' : ''}
    </div>
  `).join('')}
</body>
</html>
          `.trim();
          
          const blob = new Blob([combinedReport], { type: 'text/html;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `Interview_Reports_${selectedJob?.title || 'Export'}_${new Date().toISOString().split('T')[0]}.html`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        
        // Clear selection after export
        setSelectedApplicationIds([])
        alert(`${selectedApplications.length} interview report(s) exported successfully!`)
      }
    } catch (error) {
      console.error('Error performing bulk action:', error)
      alert('Failed to perform bulk action. Please try again.')
    }
  }

  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      await applicationsService.updateApplicationStatus(applicationId, newStatus)
      
      // Update local state
      setApplications(applications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ))
      setFilteredApplications(filteredApplications.map(app => 
        app.id === applicationId ? { ...app, status: newStatus } : app
      ))
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const clearFilters = () => {
    setFilters({
      status: [],
      scoreRange: [0, 100],
      dateApplied: '',
      educationLevel: '',
      experienceLevel: '',
      skills: []
    })
  }

  const handleViewDetail = (application) => {
    setSelectedApplication(application)
    setShowDetailModal(true)
  }

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = filteredApplications.map(app => app.id)
      setSelectedApplicationIds(allIds)
    } else {
      setSelectedApplicationIds([])
    }
  }

  const handleSelectApplication = (applicationId) => {
    setSelectedApplicationIds(prev => {
      if (prev.includes(applicationId)) {
        return prev.filter(id => id !== applicationId)
      } else {
        return [...prev, applicationId]
      }
    })
  }

  const handleViewResume = async (candidateId) => {
    try {
      console.log('🔍 handleViewResume called with candidateId:', candidateId);
      
      // Get signed URL for secure S3 access
      const response = await resumeAPI.getResumeSignedUrl(candidateId);
      console.log('✅ Response data:', response);
      
      const signedUrl = response.data?.signedUrl || response.signedUrl;
      console.log('📄 Signed Resume URL:', signedUrl);
      
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        alert('No resume found for this candidate');
      }
    } catch (error) {
      console.error('Error viewing resume:', error);
      alert('Unable to view resume. The candidate may not have uploaded one yet.');
    }
  }

  return (
    <DashboardLayout 
      sidebarContent={<EmployerSidebar />} 
      userType="employer"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{selectedJob?.title || 'Select a Job'}</h2>
              {jobs.length > 1 && (
                <select
                  value={selectedJob?._id || ''}
                  onChange={(e) => {
                    const job = jobs.find(j => j._id === e.target.value)
                    setSelectedJob(job)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {jobs.map(job => (
                    <option key={job._id} value={job._id}>{job.title}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Total Applications: <span className="font-semibold">{applications.length}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Sort By</span>
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option>Highest Score</option>
              <option>Lowest Score</option>
              <option>Most Recent</option>
              <option>Oldest</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button 
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear all
                </button>
              </div>

              {/* Status Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Status</h4>
                <div className="space-y-2">
                  {['Pending', 'Shortlisted', 'Interviewed', 'Hired', 'Rejected'].map((status) => (
                    <label key={status} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(status)}
                        onChange={() => handleStatusFilter(status)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Score Range */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Score Range</h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">{filters.scoreRange[0]}%</span>
                  <span className="text-xs text-gray-500">{filters.scoreRange[1]}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scoreRange[0]}
                  onChange={(e) => setFilters({
                    ...filters,
                    scoreRange: [parseInt(e.target.value), filters.scoreRange[1]]
                  })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Date Applied */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Date applied</h4>
                <input
                  type="text"
                  placeholder="Add Skills (e.g. Python, React)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Education Level */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Education level</h4>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Master's Degree</option>
                  <option value="bachelor">Bachelor's Degree</option>
                  <option value="master">Master's Degree</option>
                  <option value="phd">PhD</option>
                </select>
              </div>

              {/* Experience Level */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Experience level</h4>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">3 - 5 Years</option>
                  <option value="0-2">0-2 Years</option>
                  <option value="3-5">3-5 Years</option>
                  <option value="5+">5+ Years</option>
                </select>
              </div>

              {/* Skills */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Skills</h4>
                <div className="space-y-2 mb-2">
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm text-gray-700">Figma</span>
                    <button className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm text-gray-700">Sketch</span>
                    <button className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-100 px-3 py-1.5 rounded-full">
                    <span className="text-sm text-gray-700">User Research</span>
                    <button className="text-gray-500 hover:text-gray-700">×</button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Add Skill..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500">No applications match your filters</p>
                </div>
              ) : (
                <>
                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedApplicationIds.length === filteredApplications.length && filteredApplications.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Select All ({selectedApplicationIds.length} selected)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleBulkAction('shortlist')}
                        className="px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors"
                      >
                        Shortlist Selected
                      </button>
                      <button 
                        onClick={() => handleBulkAction('reject')}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Reject Selected
                      </button>
                      <button 
                        onClick={() => handleBulkAction('export')}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        📄 Export Reports
                      </button>
                    </div>
                  </div>

                  {/* Applications */}
                  <div className="space-y-4">
                    {filteredApplications.map((application) => (
                      <div
                        key={application.id}
                        className="border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between">
                          {/* Left: Checkbox and Candidate Info */}
                          <div className="flex items-start space-x-4 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedApplicationIds.includes(application.id)}
                              onChange={() => handleSelectApplication(application.id)}
                              className="w-4 h-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  Candidate: {application.candidate.name}
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                  <span className="text-gray-500">Role:</span>
                                  <span className="ml-2 text-gray-900 font-medium">{application.role}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Email:</span>
                                  <span className="ml-2 text-gray-900">{application.candidate.email}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Education:</span>
                                  <span className="ml-2 text-gray-900">{application.candidate.education}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Experience:</span>
                                  <span className="ml-2 text-gray-900 font-medium">{application.candidate.experience}</span>
                                </div>
                              </div>

                              {/* Score Badges */}
                              <div className="flex flex-wrap gap-2">
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.overall)}`}>
                                  Overall Score: {application.scores.overall}%
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.resume)}`}>
                                  Resume: {application.scores.resume}%
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.interview)}`}>
                                  Interview: {application.scores.interview}%
                                </span>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getScoreColor(application.scores.communication)}`}>
                                  Communication: {application.scores.communication}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Status and Actions */}
                          <div className="flex flex-col items-end space-y-3 ml-4">
                            <select 
                              value={application.status}
                              onChange={(e) => handleStatusChange(application.id, e.target.value)}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${getStatusColor(application.status)} focus:ring-2 focus:ring-blue-500 cursor-pointer`}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Shortlisted">Shortlisted</option>
                              <option value="Interviewed">Interviewed</option>
                              <option value="Hired">Hired</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                            <button 
                              onClick={() => handleViewDetail(application)}
                              className="w-full px-4 py-2 bg-blue-700 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 transition-colors"
                            >
                              View Detail
                            </button>
                            <button 
                              onClick={() => handleViewResume(application.candidateData?._id)}
                              className="w-full px-4 py-2 bg-gray-700 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                            >
                              View Resume
                            </button>
                            <p className="text-xs text-gray-500">Applied: {application.appliedDate}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedApplication.candidate.name}</h2>
                <p className="text-sm text-gray-600">{selectedApplication.candidate.email}</p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* AI Analysis Scores */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">AI Analysis Scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedApplication.aiAnalysis?.scores && Object.entries(selectedApplication.aiAnalysis.scores).map(([key, value]) => (
                    <div key={key} className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-2xl font-bold text-blue-600">{value}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              {selectedApplication.aiAnalysis?.strengths?.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">✅ Strengths</h3>
                  <ul className="space-y-2">
                    {selectedApplication.aiAnalysis.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-600 mr-2">•</span>
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas for Improvement */}
              {selectedApplication.aiAnalysis?.improvements?.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">📈 Areas for Improvement</h3>
                  <ul className="space-y-2">
                    {selectedApplication.aiAnalysis.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-600 mr-2">•</span>
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Insights */}
              {selectedApplication.aiAnalysis?.insights && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">💡 AI Insights</h3>
                  <p className="text-gray-700">{selectedApplication.aiAnalysis.insights}</p>
                </div>
              )}

              {/* AI Recommendation */}
              {selectedApplication.aiAnalysis?.recommendation && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">🎯 Recommendation</h3>
                  <p className="text-gray-700">{selectedApplication.aiAnalysis.recommendation}</p>
                </div>
              )}

              {/* Interview Transcript */}
              {selectedApplication.interviewTranscript?.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Interview Transcript</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 rounded-lg p-4">
                    {selectedApplication.interviewTranscript.map((entry, index) => (
                      <div key={index} className={`p-3 rounded-lg ${entry.type === 'question' ? 'bg-blue-100 border-l-4 border-blue-500' : 'bg-green-100 border-l-4 border-green-500'}`}>
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          {entry.type === 'question' ? '❓ Question' : '💬 Answer'} #{entry.questionNumber || index + 1}
                        </p>
                        <p className="text-sm text-gray-800">{entry.content}</p>
                        {entry.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Questions Answered */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-semibold text-gray-700">Total Questions Answered:</span>
                <span className="text-lg font-bold text-blue-600">{selectedApplication.aiAnalysis?.questionsAnswered || 0}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <button 
                onClick={() => {
                  const report = generateInterviewReport(selectedApplication);
                  const blob = new Blob([report], { type: 'text/html;charset=utf-8;' });
                  const link = document.createElement('a');
                  const url = URL.createObjectURL(blob);
                  link.setAttribute('href', url);
                  link.setAttribute('download', `Interview_Report_${selectedApplication.candidate.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>📄</span> Export Full Report
              </button>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleViewResume(selectedApplication.candidateData?._id)}
                  className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                >
                  View Resume
                </button>
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

export default EmployerApplicationsReview
