import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { verifyToken } from './store/slices/authSlice';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import CandidateDashboard from './pages/Candidate/CandidateDashboard';
import CandidateJobs from './pages/Candidate/CandidateJobs';
import CompanyDashboard from './pages/Company/CompanyDashboard';
import PostJob from './pages/Company/PostJob';
import Jobs from './pages/Jobs/Jobs';
import ProtectedRoute from './components/Common/ProtectedRoute';
import LoadingSpinner from './components/Common/LoadingSpinner';

function App() {
  const dispatch = useDispatch();
  const { user, loading, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(verifyToken());
    }
  }, [dispatch, token]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to={getDashboardRoute(user.role)} />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to={getDashboardRoute(user.role)} />} />
      <Route path="/jobs" element={<Layout><Jobs /></Layout>} />
      
      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to={user ? getDashboardRoute(user.role) : '/login'} />
          </ProtectedRoute>
        }
      />
      
      {/* Candidate Routes */}
      <Route
        path="/candidate/dashboard"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Layout>
              <CandidateDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/jobs"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Layout>
              <CandidateJobs />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* Company Routes */}
      <Route
        path="/company/dashboard"
        element={
          <ProtectedRoute allowedRoles={['company']}>
            <Layout>
              <CompanyDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/post-job"
        element={
          <ProtectedRoute allowedRoles={['company']}>
            <Layout>
              <PostJob />
            </Layout>
          </ProtectedRoute>
        }
      />
      
      {/* 404 Route */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

function getDashboardRoute(role) {
  switch (role) {
    case 'candidate':
      return '/candidate/dashboard';
    case 'company':
      return '/company/dashboard';
    default:
      return '/login';
  }
}

export default App;
