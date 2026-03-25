import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { candidatesAPI } from '../services/api'

const PremiumRoute = ({ children, allowedPlans = ['pro', 'elite'] }) => {
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [isAllowed, setIsAllowed] = useState(false)

  useEffect(() => {
    let mounted = true

    const verifyPlan = async () => {
      try {
        const response = await candidatesAPI.getProfile()
        const profile = response?.data || response
        const plan = (profile?.subscription?.plan || 'free').toLowerCase()

        if (mounted) {
          setIsAllowed(allowedPlans.includes(plan))
        }
      } catch (error) {
        console.error('Error verifying premium access:', error)
        if (mounted) {
          setIsAllowed(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    verifyPlan()

    return () => {
      mounted = false
    }
  }, [allowedPlans])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAllowed) {
    return (
      <Navigate
        to="/student-dashboard/subscription"
        replace
        state={{
          message: 'This feature is available only on Pro and Elite plans.',
          from: location.pathname
        }}
      />
    )
  }

  return children
}

export default PremiumRoute