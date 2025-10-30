import React, { createContext, useContext, useReducer, useEffect } from 'react'

const AppContext = createContext()

// 1. Function to safely load notifications from sessionStorage
const loadNotifications = () => {
  try {
    const savedNotifications = sessionStorage.getItem('app_notifications')
    return savedNotifications ? JSON.parse(savedNotifications) : []
  } catch (e) {
    console.error('Failed to load notifications from sessionStorage:', e)
    return []
  }
}

// 2. Initial state now loads notifications from storage
const initialState = {
  user: null,
  theme: 'light',
  notifications: loadNotifications(), // <--- LOAD FROM STORAGE HERE
  isLoading: false
}

// 3. Helper function to save notifications to sessionStorage
const saveNotifications = (notifications) => {
  try {
    sessionStorage.setItem('app_notifications', JSON.stringify(notifications))
  } catch (e) {
    console.error('Failed to save notifications to sessionStorage:', e)
  }
}


const appReducer = (state, action) => {
  let newState;

  switch (action.type) {
    case 'SET_USER':
      newState = { ...state, user: action.payload }
      break;
    case 'SET_THEME':
      newState = { ...state, theme: action.payload }
      break;
    case 'ADD_NOTIFICATION':
      newState = { 
        ...state, 
        notifications: [...state.notifications, action.payload] 
      }
      break;
    case 'REMOVE_NOTIFICATION':
      newState = { 
        ...state, 
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        ) 
      }
      break;
    case 'CLEAR_NOTIFICATIONS':
      newState = { ...state, notifications: [] }
      break;
    case 'SET_LOADING':
      newState = { ...state, isLoading: action.payload }
      break;
    default:
      return state
  }

  // 4. Synchronize state with sessionStorage after every notification-related action
  if (
    action.type === 'ADD_NOTIFICATION' || 
    action.type === 'REMOVE_NOTIFICATION' || 
    action.type === 'CLEAR_NOTIFICATIONS'
  ) {
    saveNotifications(newState.notifications);
  }

  return newState;
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  // NOTE: If you are clearing notifications manually (e.g., after they display), 
  // you must ensure the clearing logic also happens when the component mounts.

  const setUser = (user) => {
    dispatch({ type: 'SET_USER', payload: user })
  }

  const setTheme = (theme) => {
    dispatch({ type: 'SET_THEME', payload: theme })
  }

  const addNotification = (notification) => {
    const id = Date.now() + Math.random() 
    const defaultNotification = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    }
    
    dispatch({ 
      type: 'ADD_NOTIFICATION', 
      payload: defaultNotification
    })

    return id
  }

  // Convenience methods
  const showSuccess = (message, options = {}) => {
    return addNotification({
      type: 'success',
      message,
      title: 'Success',
      duration: 4000,
      ...options
    })
  }

  const showError = (message, options = {}) => {
    return addNotification({
      type: 'error',
      message,
      title: 'Error',
      duration: 6000,
      ...options
    })
  }

  const showWarning = (message, options = {}) => {
    return addNotification({
      type: 'warning',
      message,
      title: 'Warning',
      duration: 5000,
      ...options
    })
  }

  const showInfo = (message, options = {}) => {
    return addNotification({
      type: 'info',
      message,
      title: 'Info',
      duration: 4000,
      ...options
    })
  }

  const removeNotification = (id) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id })
  }

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' })
  }

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }

  const value = {
    ...state,
    setUser,
    setTheme,
    addNotification,
    removeNotification,
    clearAllNotifications,
    setLoading,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export default AppContext