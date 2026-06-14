import { useState, useEffect, useCallback } from 'react'
import { Geolocation } from '@capacitor/geolocation'

const STORAGE_KEY = 'mediinfo_user_location'

const getStored = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) }
  catch { return null }
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const addr = data.address
    return addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || addr.county || 'your area'
  } catch {
    return null
  }
}

export function useLocation() {
  const stored = getStored()
  const [location, setLocation] = useState(stored ? { lat: stored.lat, lng: stored.lng } : null)
  const [locationName, setLocationName] = useState(stored?.name || null)
  const [status, setStatus] = useState(() => stored?.source || 'idle')
  const [error, setError] = useState(null)

  const save = useCallback(async (lat, lng, source = 'manual', name = null) => {
    let resolvedName = name
    if (!resolvedName) resolvedName = await reverseGeocode(lat, lng)
    const loc = { lat, lng, source, name: resolvedName }
    setLocation({ lat, lng })
    setLocationName(resolvedName)
    setStatus(source)
    setError(null)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc))
  }, [])

  const detect = useCallback(async () => {
    setStatus('detecting')
    setError(null)
    try {
      // Use Capacitor Geolocation on Android, fallback to browser on web
      let lat, lng
      try {
        const pos = await Geolocation.getCurrentPosition({ timeout: 10000 })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      } catch {
        // fallback for web browser
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            pos => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve() },
            reject,
            { timeout: 8000, maximumAge: 300_000 }
          )
        })
      }
      await save(lat, lng, 'auto')
    } catch {
      setError('Could not detect location. Enter your area name instead.')
      const prev = getStored()
      setStatus(prev?.source || 'idle')
    }
  }, [save])

  useEffect(() => {
    if (!getStored()) detect()
  }, []) // eslint-disable-line

  return { location, locationName, status, error, detect, save }
}