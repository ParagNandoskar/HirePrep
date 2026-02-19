import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { Home, About, Features, Contact } from './pages'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import StudentApplications from './pages/StudentApplications'
import EmployerDashboard from './pages/EmployerDashboard'
import EmployerApplicationsReview from './pages/EmployerApplicationsReview'
import EmployerProfile from './pages/EmployerProfile'
import LiveInterview from './pages/LiveInterview'
import InterviewResults from './pages/InterviewResults'
import InterviewHistory from './pages/InterviewHistory'
import Leaderboard from './pages/Leaderboard'
import ProfileManagement from './pages/ProfileManagement'
import ResumeManagement from './pages/ResumeManagement'
import ExploreJobs from './pages/ExploreJobs'
import JobManagement from './pages/JobManagement'
import JobManagementEmployer from './pages/JobManagementEmployer'
import JobForm from './pages/JobForm'
import JobDetails from './pages/JobDetails'
import ScreeningInterviewStart from './pages/ScreeningInterviewStart'
import LiveScreeningInterview from './pages/LiveScreeningInterview'
import ScreeningInterviewResults from './pages/ScreeningInterviewResults'
import AIVoiceInterview from './pages/AIVoiceInterview'
import JobLeaderboard from './pages/JobLeaderboard'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import NotificationContainer from './components/NotificationContainer'

const App = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            {/* Public routes with main layout */}
            <Route path="/" element={
              <Layout>
                <Home />
              </Layout>
            } />
            <Route path="/about" element={
              <Layout>
                <About />
              </Layout>
            } />
            <Route path="/features" element={
              <Layout>
                <Features />
              </Layout>
            } />
            <Route path="/contact" element={
              <Layout>
                <Contact />
              </Layout>
            } />
            <Route path="/signup" element={
              <Layout>
                <SignUp />
              </Layout>
            } />
            <Route path="/login" element={
              <Layout>
                <Login />
              </Layout>
            } />
            
            {/* Protected dashboard routes */}
            <Route path="/student-dashboard" element={
              <ProtectedRoute requiredRole="candidate">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/applications" element={
              <ProtectedRoute requiredRole="candidate">
                <StudentApplications />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/profile" element={
              <ProtectedRoute requiredRole="candidate">
                <ProfileManagement />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/resume" element={
              <ProtectedRoute requiredRole="candidate">
                <ResumeManagement />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/explore-jobs" element={
              <ProtectedRoute requiredRole="candidate">
                <ExploreJobs />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/interview/live" element={
              <ProtectedRoute requiredRole="candidate">
                <LiveInterview />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/interview/results" element={
              <ProtectedRoute requiredRole="candidate">
                <InterviewResults />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/results" element={
              <ProtectedRoute requiredRole="candidate">
                <InterviewResults />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/leaderboard" element={
              <ProtectedRoute requiredRole="candidate">
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/interview-history" element={
              <ProtectedRoute requiredRole="candidate">
                <InterviewHistory />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/screening-interview/start" element={
              <ProtectedRoute requiredRole="candidate">
                <ScreeningInterviewStart />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/screening-interview/live" element={
              <ProtectedRoute requiredRole="candidate">
                <LiveScreeningInterview />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/screening-interview/results" element={
              <ProtectedRoute requiredRole="candidate">
                <ScreeningInterviewResults />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/ai-voice-interview" element={
              <ProtectedRoute requiredRole="candidate">
                <AIVoiceInterview />
              </ProtectedRoute>
            } />
            <Route path="/student-dashboard/job-leaderboard/:jobId" element={
              <ProtectedRoute requiredRole="candidate">
                <JobLeaderboard />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerDashboard />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/profile" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerProfile />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/applications" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerApplicationsReview />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/jobs" element={
              <ProtectedRoute requiredRole="employer">
                <JobManagementEmployer />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/jobs/create" element={
              <ProtectedRoute requiredRole="employer">
                <JobForm />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/jobs/:jobId" element={
              <ProtectedRoute requiredRole="employer">
                <JobDetails />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/jobs/:jobId/edit" element={
              <ProtectedRoute requiredRole="employer">
                <JobForm />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/job-management" element={
              <ProtectedRoute requiredRole="employer">
                <JobManagement />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/job-leaderboard/:jobId" element={
              <ProtectedRoute requiredRole="employer">
                <JobLeaderboard />
              </ProtectedRoute>
            } />
            <Route path="/employer-dashboard/company" element={
              <ProtectedRoute requiredRole="employer">
                <EmployerProfile />
              </ProtectedRoute>
            } />
          </Routes>
          <NotificationContainer />
        </Router>
      </AppProvider>
    </AuthProvider>
  )
}

export default App