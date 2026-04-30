import React, { useCallback, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'  // ✅ FIXED: added useLocation import
import { HiEye, HiEyeOff } from 'react-icons/hi'
import Button from '../components/ui/Button'
import GoogleAuthButton from '../components/auth/GoogleAuthButton'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const location = useLocation() // ✅ now properly imported
  const { login, googleAuth, isLoading } = useAuth()
  
  const [userType, setUserType] = useState('candidate') // 'candidate' or 'company'
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState({})

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // On login require password presence and basic strength check
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      const loginData = {
        email: formData.email.toLowerCase(),
        password: formData.password
      }

      const result = await login(loginData)
      
      if (result.success) {
        console.log('Login successful:', result.user?.name)

        // ✅ Redirect logic using useLocation
        const from = location.state?.from?.pathname || 
          (result.user.role === 'candidate' ? '/student-dashboard' : '/employer-dashboard')
        navigate(from, { replace: true })
      }
    } catch (error) {
      console.error('Login error:', error)
      
      let errorMessage = 'Please check your credentials and try again.'
      if (error.message.includes('Invalid email or password')) {
        errorMessage = 'Invalid email or password. Please check your credentials.'
      } else if (error.message.includes('User not found')) {
        errorMessage = 'No account found with this email. Please sign up first.'
      } else if (error.message.includes('User with this email already exists')) {
        errorMessage = 'There was an issue with your login. Please try again.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      console.error('Login error:', errorMessage)
    }
  }

  const handleGoogleCredential = useCallback(async (idToken) => {
    try {
      const result = await googleAuth({
        idToken,
        role: userType === 'candidate' ? 'candidate' : 'company',
        mode: 'login'
      })

      if (result.success) {
        const from = location.state?.from?.pathname ||
          (result.user.role === 'candidate' ? '/student-dashboard' : '/employer-dashboard')
        navigate(from, { replace: true })
      }
    } catch (error) {
      console.error('Google login error:', error)
    }
  }, [googleAuth, location.state?.from?.pathname, navigate, userType])

  return (
    <div className="min-h-screen bg-background-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl w-full flex bg-white rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Left Side - Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#FFF9E6] items-center justify-center rounded-r-4xl">
          <img src="/hero.png" className='h-full object-cover relative right-0 rounded-r-4xl' alt="" />
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary mb-2">
                Welcome Back to HirePrep
              </h2>
            </div>

            {/* User Type Selection */}
            <div className="mb-6">
              <div className="flex rounded-full bg-background-primary p-1 gap-8">
                <button
                  type="button"
                  onClick={() => setUserType('candidate')}
                  className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 ${
                    userType === 'candidate'
                      ? 'text-white shadow-lg'
                      : 'text-black hover:text-white hover:shadow-md'
                  }`}
                  style={{
                    backgroundColor: userType === 'candidate' ? '#003566' : '#0035661A'
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
                  onClick={() => setUserType('company')}
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
                  : 'Hire top talent and manage candidates efficiently'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
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
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Password */}
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
                    placeholder="Enter your password"
                  />
                  <span
                    role="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-white hover:bg-primary transition-all duration-300 ease-in-out rounded-full p-1 hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                  </span>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              {/* Remember Me */}
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

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="secondary" 
                size="lg" 
                className="w-full text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-background-secondary" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-3 text-text-muted">or continue with</span>
                </div>
              </div>

              <GoogleAuthButton
                mode="login"
                onCredential={handleGoogleCredential}
                disabled={isLoading}
              />

              {/* Sign Up Link */}
              <div className="text-center">
                <p className="text-sm text-text-muted">
                  Don't have an account?{' '}
                  <Link to="/signup" className="font-medium text-primary hover:text-secondary transition-colors">
                    Sign Up
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

export default Login
