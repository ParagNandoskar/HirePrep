// Browser Notification Utility
class NotificationManager {
  constructor() {
    this.requestPermission();
  }

  // Request notification permission
  async requestPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  }

  // Show browser notification
  showNotification(title, message, type = 'info') {
    // Notifications disabled - only console logging
    console.log(`${type.toUpperCase()}: ${title} - ${message}`);
    return null;
    
    // Original notification code commented out:
    /*
    // Fallback to alert if notifications not supported or denied
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      alert(`${title}\n${message}`);
      return;
    }

    const icons = {
      success: '✅',
      error: '❌', 
      warning: '⚠️',
      info: 'ℹ️'
    };

    const notification = new Notification(title, {
      body: message,
      icon: icons[type] || icons.info,
      badge: icons[type] || icons.info,
      requireInteraction: type === 'error', // Keep error notifications until clicked
      silent: false,
      tag: `hireprep-${type}`, // Replace previous notifications of same type
    });

    // Auto-close after 5 seconds (except errors)
    if (type !== 'error') {
      setTimeout(() => {
        notification.close();
      }, 5000);
    }

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
    */
  }

  // Show alert fallback for immediate visibility
  showAlert(title, message) {
    // Alerts disabled - only console logging
    console.log(`ALERT: ${title} - ${message}`);
    // Original: alert(`${title}\n\n${message}`);
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

// Success notification
export const showSuccess = (message, title = '🎉 Success!') => {
  return notificationManager.showNotification(title, message, 'success');
};

// Error notification
export const showError = (message, title = '❌ Error!') => {
  return notificationManager.showNotification(title, message, 'error');
};

// Warning notification
export const showWarning = (message, title = '⚠️ Warning!') => {
  return notificationManager.showNotification(title, message, 'warning');
};

// Info notification
export const showInfo = (message, title = 'ℹ️ Information') => {
  return notificationManager.showNotification(title, message, 'info');
};

// Authentication specific notifications
export const showLoginSuccess = (username = '') => {
  const message = `Login successful${username ? `, ${username}` : ''}! Welcome back to HirePrep.`;
  return showSuccess(message, '🎉 Welcome Back!');
};

export const showRegistrationSuccess = (username = '') => {
  const message = `Account created successfully${username ? ` for ${username}` : ''}! Welcome to HirePrep.`;
  return showSuccess(message, '🎉 Registration Complete!');
};

export const showLoginError = (message = 'Invalid credentials') => {
  return showError(message, '🔐 Login Failed');
};

export const showRegistrationError = (message = 'Registration failed') => {
  return showError(message, '📝 Registration Failed');
};

// Alert fallbacks for critical messages
export const showCriticalAlert = (message, title = 'Important') => {
  return notificationManager.showAlert(title, message);
};

// Export the notification manager for direct use if needed
export { notificationManager };