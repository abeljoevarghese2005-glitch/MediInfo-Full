import { useState, useEffect, useRef } from 'react'
import { useLocation } from '../hooks/useLocation'

export default function LocationBar({ onLocationReady }) {
  const { location, status, error, detect, save } = useLocation()
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState('')
  const inputRef = useRef(null)

  // Notify parent whenever location changes — in an effect, not during render
  useEffect(() => {
    if (location && onLocationReady) onLocationReady(location)
  }, [location]) // eslint-disable-line

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const handleGeocode = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setGeocoding(true)
    setGeocodeError('')
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed + ', India')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const results = await res.json()
      if (!results || results.length === 0) {
        setGeocodeError('Area not found. Try a different name.')
        setGeocoding(false)
        return
      }
      const { lat, lon, display_name } = results[0]
      save(parseFloat(lat), parseFloat(lon), 'manual')
      setEditing(false)
      setQuery('')
    } catch {
      setGeocodeError('Could not look up location. Check your connection.')
    }
    setGeocoding(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleGeocode()
    if (e.key === 'Escape') { setEditing(false); setQuery(''); setGeocodeError('') }
  }

  const locationLabel = () => {
    if (status === 'detecting') return <span className="text-cyan-600 font-medium">Detecting location…</span>
    if (status === 'auto' && location) return <span className="text-cyan-600 font-medium">📍 Location detected — showing nearby doctors</span>
    if (status === 'manual' && location) return <span className="text-cyan-700 font-medium">📍 Location set manually</span>
    if (error) return <span className="text-red-500">{error}</span>
    return <span className="text-gray-400">Location not set — enable to sort by distance</span>
  }

  return (
    <div className="flex items-center flex-wrap gap-2 px-3 py-2 bg-cyan-50 border border-cyan-100 rounded-xl mb-5 text-xs text-gray-500">
      {/* Pin icon */}
      <svg className="w-3.5 h-3.5 text-cyan-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
      </svg>

      {!editing && locationLabel()}

      {/* Manual entry — area name input */}
      {editing && (
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Enter area, city (e.g. Andheri, Mumbai)"
            value={query}
            onChange={e => { setQuery(e.target.value); setGeocodeError('') }}
            onKeyDown={handleKeyDown}
            className="flex-1 min-w-48 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white"
          />
          <button
            onClick={handleGeocode}
            disabled={geocoding || !query.trim()}
            className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 disabled:opacity-50">
            {geocoding ? 'Looking up…' : 'Set location'}
          </button>
          <button
            onClick={() => { setEditing(false); setQuery(''); setGeocodeError('') }}
            className="px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          {geocodeError && <span className="w-full text-red-500 mt-0.5">{geocodeError}</span>}
        </div>
      )}

      {/* Action buttons */}
      {!editing && (
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={detect}
            disabled={status === 'detecting'}
            className="flex items-center gap-1 px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-lg font-medium hover:bg-cyan-200 disabled:opacity-50">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Auto-detect
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">
            Enter area
          </button>
        </div>
      )}
    </div>
  )
}
