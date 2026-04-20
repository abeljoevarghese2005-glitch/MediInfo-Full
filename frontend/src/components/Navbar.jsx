import { Link, useNavigate } from 'react-router-dom'

function Navbar() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="text-xl font-bold text-gray-800">MediInfo</span>
      </Link>

      <div className="flex items-center gap-4">
        {token ? (
          <>
            <Link to="/home" className="text-gray-600 hover:text-cyan-500">
              Home
            </Link>
            <Link to="/ai-chat" className="text-gray-600 hover:text-cyan-500 flex items-center gap-1">
              🤖 AI Chat
            </Link>
            <Link to="/reminders" className="text-gray-600 hover:text-cyan-500 flex items-center gap-1">
              ⏰ Reminders
            </Link>
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="text-gray-600 hover:text-cyan-500 font-medium">
              Login
            </Link>
            <Link to="/register" className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar