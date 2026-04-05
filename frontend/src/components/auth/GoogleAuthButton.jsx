import React, { useEffect, useRef, useState } from 'react'

const GOOGLE_SCRIPT_ID = 'google-identity-services-script'

const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    if (globalThis.google?.accounts?.id) {
      resolve(globalThis.google)
      return
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(globalThis.google))
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve(globalThis.google)
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
}

const GoogleAuthButton = ({ mode = 'login', onCredential, disabled = false }) => {
  const containerRef = useRef(null)
  const [setupError, setSetupError] = useState('')

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

    if (!clientId) {
      setSetupError('Google sign-in is unavailable right now.')
      return
    }

    let isMounted = true

    const initializeGoogleButton = async () => {
      try {
        setSetupError('')
        await loadGoogleScript()

        if (!isMounted || !containerRef.current || !globalThis.google?.accounts?.id) {
          return
        }

        containerRef.current.innerHTML = ''

        globalThis.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (!response?.credential || typeof onCredential !== 'function') {
              return
            }
            onCredential(response.credential)
          }
        })

        globalThis.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: mode === 'signup' ? 'signup_with' : 'signin_with',
          width: 320
        })
      } catch (error) {
        if (isMounted) {
          setSetupError('Google sign-in could not be loaded. Please try again.')
        }
      }
    }

    initializeGoogleButton()

    return () => {
      isMounted = false
    }
  }, [mode, onCredential])

  if (setupError) {
    return <p className="text-sm text-text-muted text-center">{setupError}</p>
  }

  return (
    <div className="flex justify-center">
      <div
        ref={containerRef}
        className={`min-h-10 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        aria-disabled={disabled}
      />
    </div>
  )
}

export default GoogleAuthButton
