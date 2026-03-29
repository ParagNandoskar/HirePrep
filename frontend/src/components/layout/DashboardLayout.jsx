import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { HiMenu, HiX, HiSearch, HiChevronDown, HiLogout, HiUser } from 'react-icons/hi'
import { useAuth } from '../../context/AuthContext'
import { candidatesAPI } from '../../services/api'

const DashboardLayout = ({ children, sidebarContent, userType = 'student', focusMode = false, hideSidebar = false }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [activePlan, setActivePlan] = useState(null)
  const [avatarLoadError, setAvatarLoadError] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const dropdownRef = useRef(null)

  const profileImageUrl = user?.profileImage || user?.profile?.profileImage || user?.avatar || ''
  const userInitial = user?.name?.charAt(0) || user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen)
  }

  const handleLogout = () => {
    logout()
    setIsProfileDropdownOpen(false)
  }

  const handleViewProfile = () => {
    setIsProfileDropdownOpen(false)
    if (userType === 'employer' || user?.role === 'employer') {
      navigate('/employer-dashboard/profile')
    } else {
      navigate('/student-dashboard/profile')
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const shouldLoadCandidatePlan = user?.role !== 'employer' && userType !== 'employer'
    if (!shouldLoadCandidatePlan) {
      setActivePlan(null)
      return
    }

    let isMounted = true
    const loadCandidatePlan = async () => {
      try {
        const response = await candidatesAPI.getProfile()
        const profile = response?.data || response
        const plan = profile?.subscription?.plan || 'free'
        if (isMounted) {
          setActivePlan(String(plan).toUpperCase())
        }
      } catch (error) {
        if (isMounted) {
          setActivePlan('FREE')
        }
      }
    }

    loadCandidatePlan()
    return () => {
      isMounted = false
    }
  }, [user?.role, userType])

  useEffect(() => {
    setAvatarLoadError(false)
  }, [profileImageUrl])

  return (
    <div className="min-h-screen bg-[#0035661A] flex">
      {/* Sidebar */}
      {!hideSidebar && (
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg rounded-r-4xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo Section */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3">
              <img src="/logo.png" alt="HirePrep Logo" className="w-full h-full rounded-full object-contain" />
            </div>
            <span className="text-xl font-semibold text-primary">HirePrep</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-500 hover:text-gray-700 p-1"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarContent}
        </div>
      </div>
      )}

      {/* Overlay for mobile */}
      {!hideSidebar && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10 bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Header */}
        {!focusMode && (
        <header className=" h-16 flex items-center justify-between px-4 lg:px-6">
          {/* Left side - Mobile menu button and title */}
          <div className="flex items-center">
            <button
              onClick={toggleSidebar}
              className="lg:hidden text-gray-500 hover:text-gray-700 p-2 mr-2"
            >
              <HiMenu className="w-6 h-6" />
            </button>
            <div className="hidden md:block relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              />
            </div>
          </div>

          {/* Right side - profile */}
          <div className="flex items-center space-x-4">
            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {profileImageUrl && !avatarLoadError ? (
                    <img
                      src={profileImageUrl}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {userInitial.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 capitalize flex items-center gap-2">
                    <span>{user?.role || userType}</span>
                    {activePlan && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-emerald-700">
                        {activePlan}
                      </span>
                    )}
                  </div>
                </div>
                <HiChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user?.email}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {user?.role || userType} Account
                    </div>
                    {activePlan && (
                      <div className="mt-1 text-[11px] font-semibold text-emerald-700">
                        Active Plan: {activePlan}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={handleViewProfile}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <HiUser className="w-4 h-4 mr-3 text-gray-400" />
                    View Profile
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <HiLogout className="w-4 h-4 mr-3 text-red-500" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        )}

        {/* Main Content Area */}
        <main className={focusMode ? 'flex-1 p-3 lg:p-4' : 'flex-1 p-4 lg:p-6'}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout