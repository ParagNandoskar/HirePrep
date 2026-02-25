import React, { useState, useEffect } from 'react'
import { HiExternalLink } from 'react-icons/hi'
import { candidatesAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const RecentApplications = () => {
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await candidatesAPI.getApplications({ limit: 6 })
        
        if (response.success && response.data?.applications) {
          setApplications(response.data.applications)
        }
      } catch (error) {
        console.error('Error fetching applications:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user && user.role === 'candidate') {
      fetchApplications()
    } else {
      setIsLoading(false)
    }
  }, [user])

  const getStatusColor = (status) => {
    const statusColors = {
      'applied': 'bg-blue-100 text-blue-800',
      'reviewing': 'bg-yellow-100 text-yellow-800',
      'interviewing': 'bg-purple-100 text-purple-800',
      'shortlisted': 'bg-green-100 text-green-800',
      'hired': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    }
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h3>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h3>
      
      {applications.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <HiExternalLink className="h-12 w-12 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm">No applications yet</p>
          <p className="text-gray-400 text-xs mt-1">
            Start applying to jobs to see your applications here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Applied
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {app.job?.title || 'Job Title Not Available'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {app.job?.company?.companyName || 'Company Name Not Available'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(app.appliedAt)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* FIX 1: Converted button to span with role="button" */}
                    <span 
                      role="button" 
                      className="text-primary hover:text-secondary transition-colors cursor-pointer"
                    >
                      <HiExternalLink className="h-4 w-4" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default RecentApplications