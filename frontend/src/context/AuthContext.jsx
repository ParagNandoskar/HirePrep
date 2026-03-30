import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { authAPI, candidatesAPI } from '../services/api'
import { resolveMediaUrl } from '../utils/mediaUrl'

const AuthContext = createContext()

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null
}

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'LOGIN_SUCCESS':
      const loginState = {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      }
      return loginState
    case 'LOGOUT':
      const logoutState = {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      }
      return logoutState
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    default:
      return state
  }
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const authCheckRef = useRef(false) // Prevent multiple simultaneous auth checks

  const hydrateCandidateProfile = async (baseUser) => {
    try {
      const role = String(baseUser?.role || '').toLowerCase()
      const isEmployer = role === 'employer' || role === 'company'

      if (!baseUser || isEmployer) {
        return baseUser
      }

      const response = await candidatesAPI.getProfile()
      const profile = response?.data || response

      if (!profile || !profile._id) {
        return baseUser
      }

      const enrichedUser = {
        ...baseUser,
        firstName: profile.firstName || baseUser.firstName,
        lastName: profile.lastName || baseUser.lastName,
        phone: profile.phone || baseUser.phone,
        gender: profile.gender || baseUser.gender,
        currentRole: profile.currentRole || baseUser.currentRole,
        profileSummary: profile.profileSummary || baseUser.profileSummary,
        profileImage: resolveMediaUrl(profile.profileImage || baseUser.profileImage),
        skills: Array.isArray(profile.skills) ? profile.skills : (baseUser.skills || []),
        subscription: profile.subscription || baseUser.subscription,
        profile
      }

      authAPI.setUser(enrichedUser)
      dispatch({ type: 'UPDATE_USER', payload: enrichedUser })
      return enrichedUser
    } catch (error) {
      console.warn('Profile hydration skipped:', error.message)
      return baseUser
    }
  }

  // Check for existing token on app load
  useEffect(() => {
    const checkAuthStatus = async () => {
      // Prevent multiple simultaneous auth checks
      if (authCheckRef.current) {
        return
      }
      
      authCheckRef.current = true
      
      try {
        console.log('🔍 AUTH_CHECK: Starting authentication check...')
        console.log('🔍 AUTH_CHECK: Current token:', localStorage.getItem('authToken'))
        console.log('🔍 AUTH_CHECK: Current user in localStorage:')
        try {
          const rawUser = localStorage.getItem('user')
          if (rawUser) {
            const parsedUser = JSON.parse(rawUser)
            console.log('👤 AUTH_CHECK: Stored user data:', {
              firstName: parsedUser.firstName,
              lastName: parsedUser.lastName,
              phone: parsedUser.phone,
              email: parsedUser.email,
              allKeys: Object.keys(parsedUser)
            })
          } else {
            console.log('❌ AUTH_CHECK: No user data in localStorage')
          }
        } catch (e) {
          console.log('❌ AUTH_CHECK: Error parsing user data:', e)
        }
        
        // Clean up any corrupted localStorage data first
        authAPI.cleanup()
        
        const token = authAPI.getToken()
        const savedUser = authAPI.getUser()
        
        console.log('🔑 AUTH_CHECK: Token found:', !!token)
        console.log('👤 AUTH_CHECK: Saved user found:', !!savedUser)
        if (savedUser) {
          console.log('📋 AUTH_CHECK: Saved user profile data:', {
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            phone: savedUser.phone
          })
        }

        if (token && savedUser) {
          try {
            // Add timeout to prevent hanging requests (increased to 15 seconds)
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), 15000)
            )
            
            // Add a delay to prevent overwhelming the server and rate limiting
            await new Promise(resolve => setTimeout(resolve, 300))
            
            // Retry mechanism for auth verification
            let response
            let lastError
            
            for (let attempt = 1; attempt <= 2; attempt++) {
              try {
                response = await Promise.race([
                  authAPI.getProfile(),
                  timeoutPromise
                ])
                break // Success, exit retry loop
              } catch (error) {
                lastError = error
                if (attempt < 2 && !error.message.includes('401') && !error.message.includes('Unauthorized')) {
                  console.log(`🔄 Auth check failed, retrying... (attempt ${attempt + 1}/2)`)
                  await new Promise(resolve => setTimeout(resolve, 2000)) // Increased delay
                } else {
                  throw error // Final attempt or auth error, throw the error
                }
              }
            }
            
            console.log('📋 AUTH_CHECK: Profile fetch response:', response)
            console.log('📋 AUTH_CHECK: Response structure:', {
              hasData: !!response?.data,
              hasUser: !!response?.data?.user,
              directUser: !!response?.user,
              responseKeys: Object.keys(response || {}),
              dataKeys: response?.data ? Object.keys(response.data) : 'no data'
            })
            
            if (response && response.data && response.data.user) {
              // Token verified and user data fetched successfully
              const authUser = response.data.user
              
              // Create merged user object that preserves detailed profile data
              const mergedUser = {
                ...savedUser,
                id: authUser.id,
                email: authUser.email,
                role: authUser.role,
                isVerified: authUser.isVerified,
                avatar: authUser.avatar,
                name: authUser.name || savedUser?.name,
                profile: savedUser?.profile || authUser.profile,
                profileImage: resolveMediaUrl(savedUser?.profileImage || authUser?.profileImage || authUser?.avatar)
              }
              
              // Update saved user data with merged data
              authAPI.setUser(mergedUser)
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: mergedUser,
                  token: token
                }
              })
              await hydrateCandidateProfile(mergedUser)
            } else if (response && response.success) {
              // Backend successfully confirms auth but may not return full profile, rely on saved user
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: savedUser,
                  token: token
                }
              })
              await hydrateCandidateProfile(savedUser)
            } else {
               // Invalid response structure, rely on saved user
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                  user: savedUser,
                  token: token
                }
              })
              await hydrateCandidateProfile(savedUser)
            }
          } catch (error) {
            console.error('❌ Token verification failed:', error)
            
            // Define error categories for clear handling
            const isNetworkError = error.message.includes('fetch') || 
                                  error.message.includes('timeout') ||
                                  error.name === 'TypeError'
                                  
            const isAuthError = error.isAuthError || 
                               error.status === 401 ||
                               error.message.includes('Unauthorized') ||
                               error.message.includes('401') ||
                               error.message.includes('Token expired') ||
                               error.message.includes('Authentication failed')
            
            if (isNetworkError) {
              // Network failed: Trust saved data for now to keep the user logged in
              console.warn('🔄 Network error during auth check, trusting saved state.')
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user: savedUser, token: token }
              })
            } else if (isAuthError) {
              // Authentication failed: Clear token and log out immediately
              console.log('🗑️ Authentication error, clearing storage and logging out.')
              authAPI.removeToken()
              authAPI.removeUser()
              dispatch({ type: 'LOGOUT' })
            } else {
              // Other errors: Trust saved data as fallback
              console.warn('⚠️ Unknown error during auth check, relying on saved state.', error.message)
              dispatch({
                type: 'LOGIN_SUCCESS',
                payload: { user: savedUser, token: token }
              })
            }
          }
        } else {
          // No token or user found
          dispatch({ type: 'SET_LOADING', payload: false })
        }
      } finally {
        authCheckRef.current = false
      }
    }

    checkAuthStatus()
  }, [])

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await authAPI.login(credentials)
      
      if (response.success) {
        authAPI.setToken(response.data.token)
        authAPI.setUser(response.data.user)
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            token: response.data.token
          }
        })

        const enrichedUser = await hydrateCandidateProfile(response.data.user)
        
        return { success: true, user: enrichedUser }
      } else {
        throw new Error(response.message || 'Login failed')
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw error
    }
  }

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      
      const response = await authAPI.register(userData)
      
      if (response.success) {
        // Store token and user data (backend returns data.user and data.token)
        authAPI.setToken(response.data.token)
        authAPI.setUser(response.data.user)
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: response.data.user,
            token: response.data.token
          }
        })

        const enrichedUser = await hydrateCandidateProfile(response.data.user)
        
        return { success: true, user: enrichedUser }
      } else {
        throw new Error(response.message || 'Registration failed')
      }
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false })
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 Logging out user...')
    authAPI.removeToken()
    authAPI.setUser(null) // Clear user data from localStorage
    dispatch({ type: 'LOGOUT' })
    console.log('✅ User logged out successfully')
    
    // Let the ProtectedRoute component handle the redirect
    // No need to manually redirect here as the auth state change will trigger navigation
  }

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData }
    authAPI.setUser(updatedUser)
    dispatch({ type: 'UPDATE_USER', payload: userData })
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    isCandidate: state.user?.role === 'candidate',
    isCompany: state.user?.role === 'employer'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext