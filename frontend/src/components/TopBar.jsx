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
    <div className="flex items-center justify-end gap-4 px-10 py-5 bg-white shadow-sm">
      <Link to="/ai-chat" className="text-gray-500 hover:text-cyan-500 text-sm font-medium flex items-center gap-1">
        🤖 AI Chat
      </Link>
      <Link to="/profile" className="flex items-center gap-2 hover:opacity-80">
        <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {user.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="text-sm font-medium text-gray-700">{user.full_name}</span>
      </Link>
      <button
        onClick={handleLogout}
        className="text-gray-400 hover:text-red-500 text-xl"
        title="Logout"
      >
        ⇥
      </button>
    </div>
  )
}

export default TopBar