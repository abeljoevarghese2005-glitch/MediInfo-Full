import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSidebar } from './SidebarContext'

function DoctorTopBar() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const { open } = useSidebar()
  const [profileOpen, setProfileOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={open}
        className="text-gray-500 hover:text-gray-700 lg:hidden p-1"
        aria-label="Open menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">M</span>
        </div>
        <span className="text-base font-black text-gray-900">MediInfo</span>
      </div>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Avatar + name — clickable, opens profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(prev => !prev)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
              {user.full_name?.charAt(0).toUpperCase() || 'D'}
            </div>
            <span className="text-sm font-semibold text-gray-700 hidden md:block">{user.full_name}</span>
            <svg className={`w-3.5 h-3.5 text-gray-400 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 px-5 py-4 flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-black text-lg shrink-0">
                  {user.full_name?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{user.full_name}</p>
                  <p className="text-cyan-100 text-xs truncate">{user.specialization || 'General Physician'}</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="px-5 py-3 space-y-2.5">
                {[
                  { icon: '📞', label: 'Phone', value: user.phone || '—' },
                  { icon: '🏥', label: 'Specialization', value: user.specialization || 'General Physician' },
                  { icon: '💰', label: 'Consultation Fee', value: user.consultation_fee ? `₹${user.consultation_fee}` : '—' },
                  { icon: '✉️', label: 'Email', value: user.email || '—' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-base w-5 text-center shrink-0">{row.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">{row.label}</p>
                      <p className="text-sm text-gray-700 font-medium truncate">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Divider + Logout */}
              <div className="border-t border-gray-100 px-5 py-3">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 text-sm text-red-500 font-semibold hover:text-red-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Logout button (hidden — now inside dropdown) */}
      </div>
    </div>
  )
}

export default DoctorTopBar
