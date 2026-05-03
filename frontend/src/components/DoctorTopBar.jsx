import { useNavigate } from 'react-router-dom'
import { useSidebar } from './SidebarContext'

function DoctorTopBar() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const { open } = useSidebar()

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-gray-100 sticky top-0 z-10">
      <button onClick={open} className="text-gray-500 hover:text-gray-700 lg:hidden p-1" aria-label="Open menu">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">M</span>
        </div>
        <span className="text-base font-black text-gray-900">MediInfo</span>
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {/* Avatar + name — click to go to profile page */}
        <button
          onClick={() => navigate('/doctor/profile')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          title="View profile"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
            {user.full_name?.charAt(0).toUpperCase() || 'D'}
          </div>
          <span className="text-sm font-semibold text-gray-700 hidden md:block">{user.full_name}</span>
        </button>

        <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="Logout">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default DoctorTopBar
