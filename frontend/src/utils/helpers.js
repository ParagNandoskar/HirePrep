// Class name utility for conditional styling
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ')
}

// Format date utility
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
  
  return new Date(date).toLocaleDateString('en-US', {
    ...defaultOptions,
    ...options
  })
}

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9)
}

// Validate email
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Format phone number
export const formatPhoneNumber = (phoneNumber) => {
  const cleaned = phoneNumber.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  
  return phoneNumber
}

// Truncate text
export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}