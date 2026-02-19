import React, { useEffect, useState } from 'react'
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiXCircle, HiX } from 'react-icons/hi'
import { useApp } from '../context/AppContext'

const NotificationContainer = () => {
  const { notifications, removeNotification } = useApp()

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <HiCheckCircle className="h-7 w-7 text-white" />
      case 'error':
        return <HiXCircle className="h-7 w-7 text-white" />
      case 'warning':
        return <HiExclamationCircle className="h-7 w-7 text-white" />
      case 'info':
      default:
        return <HiInformationCircle className="h-7 w-7 text-white" />
    }
  }

  const getStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
          shadow: 'shadow-green-500/30',
          iconBg: 'bg-white/20 backdrop-blur-sm',
          ring: 'ring-2 ring-green-400/50'
        }
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-rose-600',
          shadow: 'shadow-red-500/30',
          iconBg: 'bg-white/20 backdrop-blur-sm',
          ring: 'ring-2 ring-red-400/50'
        }
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-orange-500',
          shadow: 'shadow-yellow-500/30',
          iconBg: 'bg-white/20 backdrop-blur-sm',
          ring: 'ring-2 ring-yellow-400/50'
        }
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-600',
          shadow: 'shadow-blue-500/30',
          iconBg: 'bg-white/20 backdrop-blur-sm',
          ring: 'ring-2 ring-blue-400/50'
        }
    }
  }

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-6 right-6 z-[9999] space-y-4 max-w-md w-full pointer-events-none">
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
    }, 400)
  }

  return (
    <div
      className={`
        transform transition-all duration-400 ease-out pointer-events-auto
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
        ${styles.bg} ${styles.shadow} ${styles.ring}
        shadow-2xl rounded-xl overflow-hidden
        backdrop-blur-sm
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 ${styles.iconBg} rounded-lg p-2.5 shadow-lg`}>
            {getIcon(notification.type)}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            {notification.title && (
              <p className="text-base font-bold text-white mb-1 leading-tight">
                {notification.title}
              </p>
            )}
            <p className="text-sm text-white/95 leading-relaxed font-medium">
              {notification.message}
            </p>
          </div>
          
          {/* Close Button */}
          <button
            className="shrink-0 rounded-lg p-1.5 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            onClick={handleClose}
            aria-label="Close notification"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Animated Progress Bar */}
      <div className="h-1.5 bg-black/20 overflow-hidden">
        <div 
          className="h-full bg-white/40 backdrop-blur-sm shadow-lg"
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