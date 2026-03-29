import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'

const SignUp = () => {
  const navigate = useNavigate()
  const { register, isLoading } = useAuth()
  
  const [userType, setUserType] = useState('candidate') // 'candidate' or 'company'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Company specific fields
    companyName: '',
    industry: '',
    companySize: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleUserTypeChange = (type) => {
    setUserType(type)
    // Clear form data when switching user types
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      industry: '',
      companySize: ''
    })
    setErrors({})
  }

  const validateForm = () => {
    const newErrors = {}

    if (userType === 'candidate') {
      // Full Name validation for candidates
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required'
      }
    } else {
      // Company specific validations
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required'
      }
      if (!formData.industry.trim()) {
        newErrors.industry = 'Industry is required'
      }
      if (!formData.companySize) {
        newErrors.companySize = 'Company size is required'
      }
    }

    // Email validation
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const registrationData = {
        email: formData.email.toLowerCase(),
        password: formData.password,
        role: userType
      }

      if (userType === 'candidate') {
        const [firstName, ...lastNameParts] = formData.fullName.trim().split(' ')
        registrationData.firstName = firstName
        registrationData.lastName = lastNameParts.join(' ')
      } else {
        registrationData.firstName = 'Admin' // Default admin name for company accounts
        registrationData.profile = {
          companyName: formData.companyName,
          industry: formData.industry,
          companySize: formData.companySize
        }
      }

      const result = await register(registrationData)
      
      if (result.success) {
        console.log('Registration successful:', result.user?.name)

        // Redirect to appropriate dashboard
        const dashboardPath = result.user.role === 'candidate' ? '/student-dashboard' : '/employer-dashboard'
        navigate(dashboardPath, { replace: true })
      }
    } catch (error) {
      console.error('Registration error:', error)
      
      // Handle specific error messages
      let errorMessage = 'Please check your information and try again.'
      
      if (error.message.includes('email already exists')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.'
      } else if (error.message.includes('validation') || error.message.includes('required')) {
        errorMessage = 'Please check that all required fields are filled correctly.'
      } else if (error.message.includes('password')) {
        errorMessage = 'Password must be at least 6 characters long.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      console.error('Registration error:', errorMessage)
    }
  }

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full flex bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Left Side - Illustration (omitted for brevity) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#FFF9E6] items-center justify-center rounded-r-4xl">
          <img src="/hero.png" className='h-full object-cover relative right-0 rounded-r-4xl' alt="" />
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                Create Your HirePrep Account
              </h2>
            </div>

            {/* User Type Selection (omitted for brevity) */}
            <div className="mb-6">
              <div className="flex rounded-full bg-background-primary p-1 gap-8">
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('candidate')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                    userType === 'candidate'
                      ? 'text-white shadow-lg'
                      : 'text-black hover:text-white hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: userType === 'candidate' ? '#003566' : (userType === 'company' ? '#0035661A' : '#003566'),
                    ...(userType !== 'candidate' && {
                      '--hover-bg': '#003566'
                    })
                  }}
                  onMouseEnter={(e) => {
                    if (userType !== 'candidate') {
                      e.target.style.backgroundColor = '#003566'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (userType !== 'candidate') {
                      e.target.style.backgroundColor = '#0035661A'
                    }
                  }}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleUserTypeChange('company')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                    userType === 'company'
                      ? 'text-white shadow-lg'
                      : 'text-black hover:text-white hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: userType === 'company' ? '#003566' : '#0035661A'
                  }}
                  onMouseEnter={(e) => {
                    if (userType !== 'company') {
                      e.target.style.backgroundColor = '#003566'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (userType !== 'company') {
                      e.target.style.backgroundColor = '#0035661A'
                    }
                  }}
                >
                  Employer
                </button>
              </div>
              <p className="text-sm text-text-muted mt-2 text-center">
                {userType === 'candidate' 
                  ? 'Find internships, jobs, and skill-building opportunities'
                  : 'Hire top talent and manage candidates efficiently'
                }
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Conditional fields based on user type (omitted for brevity) */}
              {userType === 'candidate' ? (
                // Candidate Fields (omitted for brevity)
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-text mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                      errors.fullName 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-background-secondary focus:border-primary'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                  )}
                </div>
              ) : (
                // Company Fields (omitted for brevity)
                <>
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-text mb-2">
                      Company Name
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                        errors.companyName 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-background-secondary focus:border-primary'
                      }`}
                      placeholder="Enter company name"
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="industry" className="block text-sm font-medium text-text mb-2">
                      Industry
                    </label>
                    <input
                      id="industry"
                      name="industry"
                      type="text"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                        errors.industry 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-background-secondary focus:border-primary'
                      }`}
                      placeholder="e.g. Technology, Healthcare, Finance"
                    />
                    {errors.industry && (
                      <p className="mt-1 text-sm text-red-600">{errors.industry}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="companySize" className="block text-sm font-medium text-text mb-2">
                      Company Size
                    </label>
                    <select
                      id="companySize"
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                        errors.companySize 
                          ? 'border-red-300 focus:border-red-500' 
                          : 'border-background-secondary focus:border-primary'
                      }`}
                    >
                      <option value="">Select company size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                    {errors.companySize && (
                      <p className="mt-1 text-sm text-red-600">{errors.companySize}</p>
                    )}
                  </div>
                </>
              )}

              {/* Email (omitted for brevity) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 transition-colors focus:outline-none ${
                    errors.email 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-background-secondary focus:border-primary'
                  }`}
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password - FIX APPLIED HERE */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-colors focus:outline-none ${
                      errors.password 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-background-secondary focus:border-primary'
                    }`}
                    placeholder="Create a strong password"
                  />
                  {/* FIX 3: Converted button to span with role="button" */}
                  <span
                    role="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-white hover:bg-primary transition-all duration-300 ease-in-out rounded-full p-1 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </span>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password - FIX APPLIED HERE */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 pr-12 rounded-xl border-2 transition-colors focus:outline-none ${
                      errors.confirmPassword 
                        ? 'border-red-300 focus:border-red-500' 
                        : 'border-background-secondary focus:border-primary'
                    }`}
                    placeholder="Confirm your password"
                  />
                  {/* FIX 4: Converted button to span with role="button" */}
                  <span
                    role="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-white hover:bg-primary transition-all duration-300 ease-in-out rounded-full p-1 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {showConfirmPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </span>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Remember Me (omitted for brevity) */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-background-secondary rounded-full"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-text-muted">
                  Remember me
                </label>
              </div>

              {/* Submit Button (omitted for brevity) */}
              <Button 
                type="submit" 
                variant="secondary" 
                size="lg" 
                className="w-full text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              {/* Login Link (omitted for brevity) */}
              <div className="text-center">
                <p className="text-sm text-text-muted">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-primary hover:text-secondary transition-colors">
                    Login
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp