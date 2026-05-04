import { useState } from 'react'
import { useLocation } from '../hooks/useLocation'

export default function LocationBar({ onLocationReady }) {
  const { location, status, error, detect, save } = useLocation()
  const [editing, setEditing] = useState(false)
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')

  if (location && onLocationReady) onLocationReady(location)

  const handleSave = () => {
    const la = parseFloat(lat), lo = parseFloat(lng)
    if (isNaN(la) || isNaN(lo)) return
    save(la, lo, 'manual')
    setEditing(false); setLat(''); setLng('')
  }

  return (
    <div className="flex items-center flex-wrap gap-2 px-3 py-2 bg-cyan-50 border border-cyan-100 rounded-xl mb-5 text-xs text-gray-500">
      <svg className="w-3.5 h-3.5 text-cyan-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
      </svg>

      {status === 'detecting' && <span className="text-cyan-600 font-medium">Detecting location…</span>}
      {status === 'auto' && location && <span className="text-cyan-600 font-medium">Location detected — showing nearby results</span>}
      {status === 'manual' && location && <span>Location set ({location.lat.toFixed(3)}, {location.lng.toFixed(3)})</span>}
      {(status === 'idle' || error) && !editing && <span className="text-red-500">{error || 'Location not set — enable for distance sorting'}</span>}

      {editing && (
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" step="any" placeholder="Latitude" value={lat} onChange={e => setLat(e.target.value)}
            className="w-28 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white" />
          <input type="number" step="any" placeholder="Longitude" value={lng} onChange={e => setLng(e.target.value)}
            className="w-28 px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 bg-white" />
          <button onClick={handleSave} className="px-3 py-1 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600">Save</button>
          <button onClick={() => setEditing(false)} className="px-3 py-1 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">Cancel</button>
        </div>
      )}

      {!editing && (
        <div className="ml-auto flex items-center gap-2">
          <button onClick={detect} className="flex items-center gap-1 px-2.5 py-1 bg-cyan-100 text-cyan-700 rounded-lg font-medium hover:bg-cyan-200">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Auto-detect
          </button>
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">
            Enter manually
          </button>
        </div>
      )}
    </div>
  )
}