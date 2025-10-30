import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  console.log('🔒 PROTECTED_ROUTE: Checking access...')
  console.log('🔒 PROTECTED_ROUTE: isLoading:', isLoading)
  console.log('🔒 PROTECTED_ROUTE: isAuthenticated:', isAuthenticated)
  console.log('🔒 PROTECTED_ROUTE: user:', user)
  console.log('🔒 PROTECTED_ROUTE: requiredRole:', requiredRole)
  console.log('🔒 PROTECTED_ROUTE: userRole:', user?.role)
  console.log('🔒 PROTECTED_ROUTE: location:', location.pathname)

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('⏳ PROTECTED_ROUTE: Still loading, showing spinner...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ PROTECTED_ROUTE: Not authenticated, redirecting to login...')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    console.log('❌ PROTECTED_ROUTE: Role mismatch, redirecting...')
    // Redirect to appropriate dashboard based on user role
    const redirectPath = user?.role === 'candidate' ? '/student-dashboard' : '/employer-dashboard'
    console.log('🔄 PROTECTED_ROUTE: Redirecting to:', redirectPath)
    return <Navigate to={redirectPath} replace />
  }

  console.log('✅ PROTECTED_ROUTE: Access granted, rendering children...')
  return children
}

export default ProtectedRoute