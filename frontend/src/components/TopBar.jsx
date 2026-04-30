import { Link, useNavigate } from 'react-router-dom'

function TopBar() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/')
  }

  return (
    <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-100">
      {/* Hamburger placeholder (mobile) */}
      <button className="text-gray-400 hover:text-gray-600 lg:hidden">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="hidden lg:block" />

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* AI Chat button */}
        <Link
          to="/ai-chat"
          className="flex items-center gap-2 bg-cyan-50 text-cyan-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-cyan-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Chat
        </Link>

        {/* User avatar + name */}
        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80">
          <div className="w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-semibold text-gray-700 hidden md:block">{user.full_name}</span>
        </Link>

        {/* Logout */}
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
