import { Link } from 'react-router-dom'

const navItems = [
  { icon: '🏠', label: 'Home', path: '/home' },
  { icon: '🔍', label: 'Search', path: '/search' },
  { icon: '🩺', label: 'Doctors', path: '/doctors' },
  { icon: '📅', label: 'Appointments', path: '/my-appointments' },
  { icon: '⏰', label: 'Reminders', path: '/reminders' },
]

function Sidebar() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  return (
    <div className="w-56 bg-white shadow-sm flex flex-col py-8 px-4 fixed h-full z-10">
      <Link to="/home" className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className="text-xl font-bold text-gray-800">MediInfo</span>
      </Link>

      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-2">Menu</p>

      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 transition-all text-sm font-medium"
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}

        {user.role === 'doctor' && (
          <Link
            to="/doctor-dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 transition-all text-sm font-medium"
          >
            <span>🏥</span>
            Dashboard
          </Link>
        )}
      </nav>
    </div>
  )
}

export default Sidebar