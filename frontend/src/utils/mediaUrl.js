import { API_ORIGIN } from '../services/apiConfig'

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i

const trimLeadingSlash = (value) => value.replace(/^\/+/, '')

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return ''
  }

  const normalized = url.trim()
  if (!normalized) {
    return ''
  }

  if (ABSOLUTE_URL_PATTERN.test(normalized)) {
    // Avoid mixed-content errors when frontend is served on HTTPS.
    if (
      typeof window !== 'undefined' &&
      window.location?.protocol === 'https:' &&
      normalized.startsWith('http://') &&
      !normalized.includes('localhost') &&
      !normalized.includes('127.0.0.1')
    ) {
      return `https://${normalized.slice('http://'.length)}`
    }
    return normalized
  }

  if (normalized.startsWith('/uploads/') || normalized.startsWith('uploads/')) {
    if (!API_ORIGIN) {
      return normalized.startsWith('/') ? normalized : `/${normalized}`
    }
    return `${API_ORIGIN}/${trimLeadingSlash(normalized)}`
  }

  return normalized
}
