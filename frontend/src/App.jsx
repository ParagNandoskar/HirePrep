import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout'
import { Home, About, Features, Contact } from './pages'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import EmployerDashboard from './pages/EmployerDashboard'
import ProfileManagement from './pages/ProfileManagement'
import ResumeManagement from './pages/ResumeManagement'
import ExploreJobs from './pages/ExploreJobs'
import EmployerProfile from './pages/EmployerProfile'
import JobManagement from './pages/JobManagement'
import { AppProvider } from './context/AppContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

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
            <Route path="/employer-dashboard/job-management" element={
              <ProtectedRoute requiredRole="employer">
                <JobManagement />
              </ProtectedRoute>
            } />
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  )
}

export default App