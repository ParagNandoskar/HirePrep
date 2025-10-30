import React, { useEffect, useState } from 'react'
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle, HiX } from 'react-icons/hi'
import { useApp } from '../context/AppContext'

const NotificationContainer = () => {
  const { notifications, removeNotification } = useApp()

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <HiCheckCircle className="h-6 w-6 text-green-500" />
      case 'error':
        return <HiXCircle className="h-6 w-6 text-red-500" />
      case 'warning':
        return <HiExclamationCircle className="h-6 w-6 text-yellow-500" />
      case 'info':
      default:
        return <HiInformationCircle className="h-6 w-6 text-blue-500" />
    }
  }

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-green-500',
          iconBg: 'bg-green-50',
          textColor: 'text-gray-900',
          subTextColor: 'text-gray-600'
        }
      case 'error':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-red-500',
          iconBg: 'bg-red-50',
          textColor: 'text-gray-900',
          subTextColor: 'text-gray-600'
        }
      case 'warning':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-yellow-500',
          iconBg: 'bg-yellow-50',
          textColor: 'text-gray-900',
          subTextColor: 'text-gray-600'
        }
      case 'info':
      default:
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-blue-500',
          iconBg: 'bg-blue-50',
          textColor: 'text-gray-900',
          subTextColor: 'text-gray-600'
        }
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 space-y-3 max-w-sm sm:max-w-sm w-full sm:w-auto">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          getIcon={getIcon}
          getStyles={getStyles}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

const NotificationItem = ({ notification, getIcon, getStyles, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const styles = getStyles(notification.type)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto-remove after duration
    const timer = setTimeout(() => {
      handleClose()
    }, notification.duration || 5000)

    return () => clearTimeout(timer)
  }, [notification])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
        }
        ${styles.bg} ${styles.border}
        shadow-lg rounded-lg pointer-events-auto
        max-w-sm w-full overflow-hidden
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`shrink-0 ${styles.iconBg} rounded-full p-2`}>
            {getIcon(notification.type)}
          </div>
          <div className="ml-3 w-0 flex-1">
            {notification.title && (
              <p className={`text-sm font-semibold ${styles.textColor} mb-1`}>
                {notification.title}
              </p>
            )}
            <p className={`text-sm ${styles.subTextColor} leading-relaxed`}>
              {notification.message}
            </p>
          </div>
          <div className="ml-4 shrink-0">
            <button
              className="inline-flex rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              onClick={handleClose}
            >
              <span className="sr-only">Close</span>
              <HiX className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div 
          className={`h-full transition-all ease-linear ${
            notification.type === 'success' ? 'bg-green-500' :
            notification.type === 'error' ? 'bg-red-500' :
            notification.type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
          }`}
          style={{
            animation: `shrink ${notification.duration || 5000}ms linear forwards`
          }}
        />
      </div>
    </div>
  )
}

export default NotificationContainer

// Add CSS animation for progress bar
const style = document.createElement('style')
style.textContent = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`
document.head.appendChild(style)