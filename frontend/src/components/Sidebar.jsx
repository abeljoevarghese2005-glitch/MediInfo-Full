import { Link, useLocation } from 'react-router-dom'

const navItems = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    label: 'Home', path: '/home'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: 'Book a Doctor', path: '/doctors'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: 'My Appointments', path: '/my-appointments'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: 'Live Queue', path: '/live-queue'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    label: 'Notifications', path: '/reminders'
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: 'Profile', path: '/profile'
  },
]

// SidebarContent is shared between desktop sidebar and mobile drawer
function SidebarContent({ onClose }) {
  const location = useLocation()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  return (
    <>
      {/* Logo */}
      <Link
        to="/home"
        onClick={onClose}
        className="flex items-center gap-2 mb-8 px-3"
      >
        <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-black text-base">M</span>
        </div>
        <span className="text-xl font-black text-gray-900 tracking-tight">MediInfo</span>
      </Link>

      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">Menu</p>

      <nav className="flex flex-col gap-0.5 flex-1">
        {navItems.map(item => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-cyan-50 text-cyan-600 border-l-4 border-cyan-500'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className={active ? 'text-cyan-500' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}

        {/* Doctor dashboard link */}
        {user.role === 'doctor' && (
          <Link
            to="/doctor-dashboard"
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              location.pathname === '/doctor-dashboard'
                ? 'bg-cyan-50 text-cyan-600 border-l-4 border-cyan-500'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className={location.pathname === '/doctor-dashboard' ? 'text-cyan-500' : 'text-gray-400'}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
            Dashboard
          </Link>
        )}
      </nav>
    </>
  )
}

// Sidebar is now a controlled component — TopBar passes isOpen + onClose
function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* ── Desktop sidebar (always visible on lg+) ── */}
      <div className="hidden lg:flex w-56 bg-white border-r border-gray-100 flex-col py-6 px-3 fixed h-full z-10">
        <SidebarContent onClose={() => {}} />
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white z-30 flex flex-col py-6 px-3 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <SidebarContent onClose={onClose} />
      </div>
    </>
  )
}

export default Sidebar
