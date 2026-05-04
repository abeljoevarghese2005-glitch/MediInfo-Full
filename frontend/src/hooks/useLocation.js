import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'mediinfo_user_location'
const getStored = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  catch { return null }
}

export function useLocation() {
  const [location, setLocation] = useState(getStored)
  const [status, setStatus] = useState(() => getStored() ? 'manual' : 'idle')
  const [error, setError] = useState(null)

  const save = useCallback((lat, lng, source = 'manual') => {
    const loc = { lat, lng }
    setLocation(loc)
    setStatus(source)
    setError(null)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
    const token = sessionStorage.getItem('token')
    if (token) {
      fetch(
        `https://mediinfo-full-production.up.railway.app/auth/update-location?lat=${lat}&lng=${lng}`,
        { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {})
    }
  }, [])

  const detect = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    setStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => save(pos.coords.latitude, pos.coords.longitude, 'auto'),
      () => { setError('Could not detect location. Enter it manually.'); setStatus(getStored() ? 'manual' : 'idle') },
      { timeout: 8000, maximumAge: 300_000 }
    )
  }, [save])

  useEffect(() => { if (!getStored()) detect() }, []) // eslint-disable-line

  return { location, status, error, detect, save }
}