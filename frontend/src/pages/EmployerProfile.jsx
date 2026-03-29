import React, { useState, useEffect } from 'react'
import { HiEye, HiEyeOff, HiCamera } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import EmployerSidebar from '../components/dashboard/EmployerSidebar'
import Button from '../components/ui/Button'
import { companiesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'

const EmployerProfile = () => {
  const { user } = useAuth()
  const { addNotification } = useApp()
  
  const [formData, setFormData] = useState({
    email: '',
    contactNumber: '',
    designation: '',
    experience: '',
    company: '',
    bio: '',
    website: '',
    industry: '',
    companySize: '',
    password: '',
    confirmPassword: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasFetchedRef = React.useRef(false)
  const isFetchingRef = React.useRef(false)

  // Fetch profile data on component mount
  useEffect(() => {
    console.log('DEBUG: EmployerProfile useEffect triggered')
    console.log('DEBUG: user:', user)
    console.log('DEBUG: authToken exists:', !!localStorage.getItem('authToken'))
    
    // Prevent duplicate fetches
    if (hasFetchedRef.current || isFetchingRef.current) {
      console.log('DEBUG: Already fetched or fetching, skipping...')
      return
    }
    
    // Mark as fetching
    isFetchingRef.current = true
    
    // Prevent duplicate fetches during React Strict Mode
    let isCancelled = false
    
    const fetchProfile = async () => {
      if (isCancelled) return
      
      console.log('DEBUG: Starting fetchProfile...')
      try {
        const response = await companiesAPI.getProfile()
        
        console.log('DEBUG: API Response:', response)
        console.log('DEBUG: Company Data:', response?.data)
        
        if (response?.data && response.data.companyName) {
          // response.data is the company object
          const company = response.data
          setFormData({
            email: user?.email || '',
            contactNumber: company.phone || company.contactPerson?.phone || '',
            designation: company.contactPerson?.designation || '',
            experience: company.contactPerson?.experience || '',
            company: company.companyName || '',
            bio: company.description || '',
            website: company.website || '',
            industry: company.industry || '',
            companySize: company.companySize || '',
            password: '',
            confirmPassword: ''
          })
          
          console.log('DEBUG: Form Data Set:', {
            company: company.companyName,
            industry: company.industry,
            contactNumber: company.phone,
            designation: company.contactPerson?.designation
          })
          
          // Set profile image if exists
          if (company.logo) {
            setProfileImage(company.logo)
          }
        } else {
          // New user - set email from auth context
          console.log('DEBUG: No company data found, using defaults')
          setFormData(prev => ({
            ...prev,
            email: user?.email || ''
          }))
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
        // If profile doesn't exist (404), that's normal for new users
        // Also ignore "user already exists" errors as they indicate caching issues
        if (error.message && 
            !error.message.includes('404') && 
            !error.message.includes('not found') &&
            !error.message.includes('user already exists')) {
          addNotification({
            type: 'error',
            message: 'Failed to load profile data'
          })
        }
        // Set email from auth context even if fetch fails
        setFormData(prev => ({
          ...prev,
          email: user?.email || ''
        }))
      } finally {
        setIsLoading(false)
        hasFetchedRef.current = true
      }
    }

    // If auth context has user or a token exists, fetch profile so page loads when visiting directly
    if (user || localStorage.getItem('authToken')) {
      fetchProfile()
    } else {
      setIsLoading(false)
    }
    
    // Cleanup function to cancel fetch if component unmounts
    return () => {
      isCancelled = true
    }
  }, [user]) // Removed addNotification from dependencies to prevent infinite loop

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate password fields if provided
    if (formData.password || formData.confirmPassword) {
      if (formData.password !== formData.confirmPassword) {
        addNotification({
          type: 'error',
          message: 'Passwords do not match!'
        })
        return
      }
      
      if (formData.password.length < 6) {
        addNotification({
          type: 'error',
          message: 'Password must be at least 6 characters long!'
        })
        return
      }
    }
    
    // Validate required fields for company creation
    if (!formData.company || !formData.company.trim()) {
      addNotification({
        type: 'error',
        message: 'Company name is required!'
      })
      return
    }
    
    if (!formData.industry) {
      addNotification({
        type: 'error',
        message: 'Please select an industry!'
      })
      return
    }
    
    if (!formData.companySize) {
      addNotification({
        type: 'error',
        message: 'Please select company size!'
      })
      return
    }
    
    try {
      setIsLoading(true)
      
      const profileData = {
        companyName: formData.company.trim(),
        industry: formData.industry,
        companySize: formData.companySize,
        // Store phone at top level as per Company model
        phone: formData.contactNumber.trim() || undefined,
        // Store designation and experience in contactPerson structure
        contactPerson: {
          name: user?.name || 'Admin',
          email: user?.email || formData.email,
          designation: formData.designation || undefined,
          experience: formData.experience || undefined,
          phone: formData.contactNumber.trim() || undefined
        }
      }

      // Add optional fields if they have values
      if (formData.bio && formData.bio.trim()) {
        profileData.description = formData.bio.trim()
      }

      if (formData.website && formData.website.trim()) {
        profileData.website = formData.website.trim()
      }
      
      // Only include password if it's provided and validated
      if (formData.password && formData.password.trim()) {
        profileData.password = formData.password
      }
      
      const response = await companiesAPI.updateProfile(profileData)
      
      console.log('Profile update response:', response); // Debug log
      
      if (response.success) {
        addNotification({
          type: 'success',
          message: 'Profile updated successfully!'
        })
        
        // Update form data with the returned company data if available
        if (response.data) {
          const company = response.data
          setFormData(prev => ({
            ...prev,
            company: company.companyName || prev.company,
            industry: company.industry || prev.industry,
            companySize: company.companySize || prev.companySize,
            website: company.website || prev.website,
            bio: company.description || prev.bio,
            contactNumber: company.phone || prev.contactNumber,
            designation: company.contactPerson?.designation || prev.designation,
            experience: company.contactPerson?.experience || prev.experience,
            password: '',
            confirmPassword: ''
          }))
        } else {
          // Clear password fields after successful update
          setFormData(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }))
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      addNotification({
        type: 'error',
        message: error.message || 'Failed to update profile. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout 
      sidebarContent={<EmployerSidebar />} 
      userType="employer"
    >
      <div className="max-w-4xl mx-auto">
        {isLoading && !formData.email ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-500">Loading profile...</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Company Profile</h1>
              <p className="text-gray-600">
                {formData.company ? 'Update your company information and settings' : 'Complete your company profile to get started'}
              </p>
            </div>
            
          <form onSubmit={handleSubmit} className="space-y-8 flex flex-col md:flex-row gap-6 md:items-start">
            {/* Profile Image Section */}
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-pink-100 flex items-center justify-center">
                      <span className="text-3xl text-pink-600 font-semibold">
                        {formData.company ? formData.company[0] : 'C'}
                      </span>
                    </div>
                  )}
                </div>
                {/* FIX: The label is fine here, but if this whole div is nested in a button 
                    the inner span will help prevent the error. */}
                <label 
                  htmlFor="profile-image" 
                  className="absolute bottom-2 right-2 bg-gray-800 text-white p-2 rounded-full cursor-pointer hover:bg-gray-700 transition-colors"
                  // Added role="button" to the label for accessibility, but it is not a button tag
                  role="button"
                >
                  <HiCamera className="w-4 h-4" />
                </label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>
            
            <div className='flex flex-col gap-6 my-6 mx-4 flex-1'>
              {/* Company Name and Industry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    value={formData.company}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    style={{ backgroundColor: '#0035661A' }}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none cursor-pointer"
                    style={{ backgroundColor: '#0035661A' }}
                  >
                    <option value="">Select Industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Education">Education</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Media">Media</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Email and Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    style={{ backgroundColor: '#0035661A' }}
                    disabled
                  />
                </div>
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://company.com"
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    style={{ backgroundColor: '#0035661A' }}
                  />
                </div>
              </div>

              {/* Contact Number and Company Size */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ backgroundColor: '#0035661A' }}>
                    <span className="px-4 py-3 bg-gray-200 text-gray-600 font-medium border-r border-gray-300">
                      +91
                    </span>
                    <input
                      id="contactNumber"
                      name="contactNumber"
                      type="tel"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                      style={{ backgroundColor: 'transparent' }}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="companySize"
                    name="companySize"
                    value={formData.companySize}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none cursor-pointer"
                    style={{ backgroundColor: '#0035661A' }}
                  >
                    <option value="">Select Company Size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="501-1000">501-1000 employees</option>
                    <option value="1000+">1000+ employees</option>
                  </select>
                </div>
              </div>

              {/* Designation and Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="designation" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Role
                  </label>
                  <select
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none cursor-pointer"
                    style={{ backgroundColor: '#0035661A' }}
                  >
                    <option value="">Select Your Role</option>
                    <option value="Recruiter">Recruiter</option>
                    <option value="HR Manager">HR Manager</option>
                    <option value="Talent Acquisition">Talent Acquisition</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="CEO">CEO</option>
                    <option value="CTO">CTO</option>
                    <option value="Founder">Founder</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Experience
                  </label>
                  <select
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none cursor-pointer"
                    style={{ backgroundColor: '#0035661A' }}
                  >
                    <option value="">Select Experience</option>
                    <option value="0-1 Years">0-1 Years</option>
                    <option value="2-5 Years">2-5 Years</option>
                    <option value="6-10 Years">6-10 Years</option>
                    <option value="10+ Years">10+ Years</option>
                    <option value="15+ Years">15+ Years</option>
                  </select>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password (optional)
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full px-4 py-3 pr-12 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                      style={{ backgroundColor: '#0035661A' }}
                    />
                    {/* FIX 1: Changed from button to span with role="button" to prevent illegal nesting */}
                    <span
                      role="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                    </span>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm new password"
                      className="w-full px-4 py-3 pr-12 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                      style={{ backgroundColor: '#0035661A' }}
                    />
                    {/* FIX 2: Changed from button to span with role="button" to prevent illegal nesting */}
                    <span
                      role="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                    </span>
                  </div>
                  {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Company Description */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Description
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
                  style={{ backgroundColor: '#0035661A' }}
                  placeholder="Describe your company, its mission, values, and what makes it unique..."
                />
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="px-8"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default EmployerProfile