import { Link, useNavigate } from 'react-router-dom'
import { useSidebar } from './SidebarContext'

function TopBar() {
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
      <Link to="/home" className="flex items-center gap-2 lg:hidden">
        <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">M</span>
        </div>
        <span className="text-base font-black text-gray-900">MediInfo</span>
      </Link>

      {/* Desktop spacer */}
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Link
          to="/ai-chat"
          className="flex items-center gap-2 bg-cyan-50 text-cyan-600 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="hidden sm:inline">AI Chat</span>
        </Link>

        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80">
          <div className="w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-semibold text-gray-700 hidden md:block">{user.full_name}</span>
        </Link>

        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Logout"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TopBar
