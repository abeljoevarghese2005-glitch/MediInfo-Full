import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mediinfo_user_location'

const getStored = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  catch { return null }
}

export function useLocation() {
  const stored = getStored()
  const [location, setLocation] = useState(stored ? { lat: stored.lat, lng: stored.lng } : null)
  const [status, setStatus] = useState(() => stored?.source || 'idle')
  const [error, setError] = useState(null)

  const save = useCallback((lat, lng, source = 'manual') => {
    const loc = { lat, lng, source }
    setLocation({ lat, lng })
    setStatus(source)
    setError(null)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))

    const token = localStorage.getItem('token')
    if (token) {
      fetch(
        `https://mediinfo-full-production.up.railway.app/auth/update-location?lat=${lat}&lng=${lng}`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {})
    }
  }, [])

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported on this device.')
      return
    }
    setStatus('detecting')
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => save(pos.coords.latitude, pos.coords.longitude, 'auto'),
      () => {
        setError('Could not detect location. Enter your area name instead.')
        const prev = getStored()
        setStatus(prev?.source || 'idle')
      },
      { timeout: 8000, maximumAge: 300_000 }
    )
  }, [save])

  // Auto-detect on first load only if nothing is stored
  useEffect(() => {
    if (!getStored()) detect()
  }, []) // eslint-disable-line

  return { location, status, error, detect, save }
}