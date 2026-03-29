import React, { useState, useEffect } from 'react'
import { HiEye, HiEyeOff, HiCamera, HiX, HiRefresh } from 'react-icons/hi'
import DashboardLayout from '../components/layout/DashboardLayout'
import StudentSidebar from '../components/dashboard/StudentSidebar'
import Button from '../components/ui/Button'
import { candidatesAPI, resumeAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const ProfileManagement = () => {
  const { user, updateUser, isLoading: authLoading } = useAuth()
  
  // FIX: Initialize formData directly from the user object in AuthContext.
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    contactNumber: user?.phone || '',
    currentRole: user?.currentRole || 'Student', 
    gender: user?.gender || 'prefer-not-to-say', 
    password: '',
    confirmPassword: '',
    bio: user?.profileSummary || ''
  })

  // Initialize skills from user object
  const initialSkills = user?.skills?.map(skill => 
    typeof skill === 'string' ? skill : skill.name
  ).filter(Boolean) || []
  
  const [skills, setSkills] = useState(initialSkills)
  const [autoExtractedSkills, setAutoExtractedSkills] = useState([])
  const [newSkill, setNewSkill] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [profileImage, setProfileImage] = useState(user?.profileImage || null)
  const [isSyncing, setIsSyncing] = useState(false) // Prevent multiple sync calls
  const [isUploadingImage, setIsUploadingImage] = useState(false) // Profile image upload state
  const [hasAttemptedAutoSync, setHasAttemptedAutoSync] = useState(false) // Prevent infinite auto-sync loops
  const [hasUpdatedUserContext, setHasUpdatedUserContext] = useState(false) // Prevent useEffect loops
  const [noResumeAvailable, setNoResumeAvailable] = useState(false) // Track if no resume exists
  
  // Use a dedicated loading state for the profile component
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  // Define handleSyncSkills before useEffect so it can be called during profile load
  const handleSyncSkills = async () => {
    if (isSyncing) {
      return;
    }
    
    try {
      setIsSyncing(true);
      const response = await resumeAPI.syncSkills();
      
      // Check if no resume is available
      if (response.noResume) {
        setNoResumeAvailable(true)
        return // Exit early, this is expected behavior
      }
      
      // Reload the profile to get updated skills
      const profileResponse = await candidatesAPI.getProfile();
      const profile = profileResponse?.data;
      
      if (profile && profile.skills && Array.isArray(profile.skills)) {
        const skillsArray = profile.skills.map(skill => 
          typeof skill === 'string' ? skill : skill.name
        ).filter(Boolean);
        
        const autoExtracted = profile.skills.filter(skill => {
          return typeof skill === 'object' && skill.source === 'resume-extracted';
        }).map(skill => skill.name);
        
        setSkills(skillsArray);
        setAutoExtractedSkills(autoExtracted);
        
        // Update the form data with the new skills to prevent further auto-sync
        setFormData(prev => ({
          ...prev,
          skills: skillsArray
        }));
      }
    } catch (error) {
      // "No resume found" for sync-skills is normal - user just doesn't have a resume to sync from
      if (error.message?.includes('No resume found') || error.message?.includes('404')) {
        setNoResumeAvailable(true) // Remember that no resume is available
      } else {
        console.error('Error syncing skills:', error)
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      // Return if AuthContext hasn't finished checking the token yet
      if (authLoading) {
        return
      }
      
      try {
        // Only show loading indicator if we don't have user data yet
        if (!user) {
             setIsProfileLoading(true) 
        }

        // Use auth context for quick prefill, but always continue to API fetch
        // so UI reflects latest server state.
        if (user && (user.firstName || user.lastName || user.phone)) {
          
          // Check if we have essential data, if not, fetch from API
          if (!user.phone || !user.profileImage) {
            // Don't return early, continue to API fetch for complete data
          } else {
            // Update form with auth context data
            setFormData({
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              email: user.email || '',
              contactNumber: user.phone || '',
              currentRole: user.currentRole || '',
              gender: user.gender || '',
              password: '',
              confirmPassword: '',
              bio: user.profileSummary || ''
            })
            
            // Set profile image from auth context
            setProfileImage(user.profileImage || null)
            
            if (user.skills && Array.isArray(user.skills)) {
              const skillsArray = user.skills.map(skill => 
                typeof skill === 'string' ? skill : skill.name
              ).filter(Boolean)
              
              // Process auto-extracted skills from AuthContext
              const autoExtracted = user.skills.filter(skill => {
                if (typeof skill === 'object' && skill.source) {
                  return skill.source === 'resume-extracted'
                }
                return false
              }).map(skill => skill.name)
              
              setSkills(skillsArray)
              setAutoExtractedSkills(autoExtracted)
              
              // If we have skills but no source info, we need fresh data from API
              if (skillsArray.length > 0 && autoExtracted.length === 0) {
                // Continue to API fetch for complete data
              }
            } else {
              // Continue to API fetch for complete data
            }
          }
        }

        // Add a delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))

        const response = await candidatesAPI.getProfile()
        
        // Handle both direct response and wrapped response
        const profile = response.data || response
        
        if (profile && profile._id) {
          // Update form fields with latest API data
          setFormData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            email: user?.email || '', 
            contactNumber: profile.phone || '',
            currentRole: profile.currentRole || 'Student',
            gender: profile.gender || 'prefer-not-to-say',
            password: '',
            confirmPassword: '',
            bio: profile.profileSummary || ''
          })
          
          setProfileImage(profile.profileImage || null)

          // Update skills
          if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
            const skillsArray = profile.skills.map(skill => 
              typeof skill === 'string' ? skill : skill.name
            ).filter(Boolean)
            
            setSkills(skillsArray)
            
            // Logic for identifying auto-extracted skills
            const autoExtracted = profile.skills.filter(skill => {
              if (typeof skill === 'object' && skill.source) {
                return skill.source === 'resume-extracted'
              }
              return false
            }).map(skill => skill.name)
            
            setAutoExtractedSkills(autoExtracted)
          } else {
            // API is source of truth: clear stale local/auth skills immediately.
            setSkills([])
            setAutoExtractedSkills([])

            // Keep sync explicit: do not auto-sync from resume on page load.
            // Users can use the "Sync from Resume" action when they want to repopulate skills.
          }
          
          // Sync successful profile data back to AuthContext (only once per session)
          if (!hasUpdatedUserContext) {
            updateUser({
              firstName: profile.firstName,
              lastName: profile.lastName,
              phone: profile.phone,
              currentRole: profile.currentRole,
              gender: profile.gender,
              profileSummary: profile.profileSummary,
              skills: profile.skills,
              profileImage: profile.profileImage,
              profile: profile
            })
            setHasUpdatedUserContext(true)
          }

        } else {
          // If API returns no profile, the form still holds the initial user data.
        }
      } catch (error) {
        // Error handling without console spam
        if (user && (user.firstName || user.lastName || user.phone)) {
          // Use cached user data as fallback
        } else {
          // No fallback data available
        }
      } finally {
        setIsProfileLoading(false)
      }
    }

    // Only fetch profile if the user object is available and auth is finished and we haven't updated context yet
    if (user && !authLoading && !hasUpdatedUserContext) {
      fetchProfile()
    } else if (!authLoading) {
      // If auth is done and no user (or user object exists but no profile fetch needed)
      setIsProfileLoading(false)
    }
  }, [user?.email, user?.firstName, user?.lastName, user?.phone, authLoading, hasUpdatedUserContext]) // More specific dependencies

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()])
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter(skill => skill !== skillToRemove))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      alert('File size must be less than 5MB')
      return
    }

    try {
      setIsUploadingImage(true)

      // Upload to AWS S3
      const response = await candidatesAPI.uploadProfileImage(file)
      
      // Handle both direct response and nested data response
      const profileImageUrl = response?.profileImage || response?.data?.profileImage;
      
      if (profileImageUrl) {
        // Update local state
        setProfileImage(profileImageUrl)
        
        // Update auth context
        updateUser({ profileImage: profileImageUrl })
        
        // Also update formData to ensure consistency
        setFormData(prev => ({
          ...prev,
          profileImage: profileImageUrl
        }));
      } else {
        throw new Error('Upload response missing profile image URL')
      }
    } catch (error) {
      alert('Failed to upload profile image. Please try again.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setIsProfileLoading(true)
      
      // Validation and data preparation (omitted for brevity)
      const profileData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.contactNumber,
        gender: formData.gender,
        currentRole: formData.currentRole,
        profileSummary: formData.bio.trim(),
        skills: skills.map(skill => ({ name: skill, level: 'Intermediate', yearsOfExperience: 1 })),
        ...(formData.password && { password: formData.password })
      }
      
      const response = await candidatesAPI.updateProfile(profileData)
      
      if (response && response.message) {
        if (response._id) {
          // Update auth context
          const updatedUserData = { ...user, ...response }
          updateUser(updatedUserData)
          
          // Update local state based on API response to reflect backend values
          setFormData(prev => ({
            ...prev,
            firstName: response.firstName || '',
            lastName: response.lastName || '',
            contactNumber: response.phone || '',
            currentRole: response.currentRole || 'Student',
            gender: response.gender || 'prefer-not-to-say',
            bio: response.profileSummary || '',
            password: '', 
            confirmPassword: ''
          }))
          
          // Update skills state based on API response
          if (response.skills && Array.isArray(response.skills)) {
            const skillsArray = response.skills.map(skill => 
              typeof skill === 'string' ? skill : skill.name
            ).filter(Boolean)
            setSkills(skillsArray)
          }

        }
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setIsProfileLoading(false)
    }
  }
  
  return (
    <DashboardLayout 
      sidebarContent={<StudentSidebar />} 
      userType="student"
    >
      <div className="max-w-4xl mx-auto">
        {isProfileLoading ? (
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
                      onError={(e) => {
                        console.error('❌ Profile image failed to load:', profileImage);
                        // Set fallback to null to show initials instead
                        setProfileImage(null);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center">
                      <span className="text-3xl text-blue-600 font-semibold">
                        {formData.firstName ? formData.firstName[0] : ''}
                        {formData.lastName ? formData.lastName[0] : ''}
                        {!formData.firstName && !formData.lastName ? 'U' : ''}
                      </span>
                    </div>
                  )}
                  
                  {/* Upload overlay when uploading */}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
                        <span className="text-xs">Uploading...</span>
                      </div>
                    </div>
                  )}
                </div>
                <label 
                  htmlFor="profile-image" 
                  className={`absolute bottom-2 right-2 p-2 rounded-full cursor-pointer transition-colors ${
                    isUploadingImage 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                  role="button"
                >
                  <HiCamera className="w-4 h-4" />
                </label>
                <input
                  id="profile-image"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                  className="hidden"
                />
              </div>
            </div>
            <div className='flex  flex-col gap-6 my-6 mx-4 flex-1'>
                {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  style={{ backgroundColor: '#0035661A' }}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                  style={{ backgroundColor: '#0035661A' }}
                />
              </div>
            </div>

            {/* Email and Contact */}
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
            </div>

            {/* Role and Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="currentRole" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Role
                </label>
                <select
                  id="currentRole"
                  name="currentRole"
                  value={formData.currentRole}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none cursor-pointer"
                  style={{ backgroundColor: '#0035661A' }}
                >
                  <option value="Student">Student</option>
                  <option value="Fresh Graduate">Fresh Graduate</option>
                  <option value="Working Professional">Working Professional</option>
                  <option value="Job Seeker">Job Seeker</option>
                </select>
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors appearance-none cursor-pointer"
                  style={{ backgroundColor: '#0035661A' }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Password Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    style={{ backgroundColor: '#0035661A' }}
                  />
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
                  Re-enter Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 pr-12 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    style={{ backgroundColor: '#0035661A' }}
                  />
                  <span
                    role="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </span>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Skills
                </label>
                <button
                  type="button"
                  onClick={handleSyncSkills}
                  disabled={isSyncing}
                  className={`inline-flex items-center px-3 py-1 text-xs font-medium transition-colors rounded-md ${
                    isSyncing 
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                      : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                  }`}
                  title="Sync skills from uploaded resume"
                >
                  <HiRefresh className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync from Resume'}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-4">
                {skills.map((skill) => {
                  const isAutoExtracted = autoExtractedSkills.includes(skill)
                  return (
                    <span
                      key={skill}
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm ${
                        isAutoExtracted 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'text-gray-700'
                      }`}
                      style={!isAutoExtracted ? { backgroundColor: '#0035661A' } : {}}
                    >
                      {skill}
                      {isAutoExtracted && (
                        <span className="ml-1 text-xs text-green-600" title="Auto-extracted from resume">
                          ✓
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-2 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <HiX className="h-4 w-4" />
                      </button>
                    </span>
                  )
                })}
                <div className="flex items-center">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    placeholder="Add skills"
                    className="px-4 py-2 border-0 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    style={{ backgroundColor: '#0035661A' }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSkill()
                      }
                    }}
                  />
                  {newSkill.trim() && (
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="ml-2 text-primary hover:text-secondary text-sm transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
                style={{ backgroundColor: '#0035661A' }}
                placeholder="Tell us about yourself..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="px-8"
                disabled={isProfileLoading}
              >
                {isProfileLoading ? 'Saving...' : 'Save Changes'}
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

export default ProfileManagement