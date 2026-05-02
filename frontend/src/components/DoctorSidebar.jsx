import { Link, useLocation } from 'react-router-dom'
import { useSidebar } from './SidebarContext'

const doctorNavItems = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    label: 'Dashboard',
    path: '/doctor-dashboard',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Appointments',
    path: '/doctor-appointments',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Live Queue',
    path: '/doctor-live-queue',
  },
]

function DoctorSidebarContent({ onClose }) {
  const location = useLocation()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <Link
        to="/doctor-dashboard"
        onClick={onClose}
        className="flex items-center gap-2.5 mb-8 px-2"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-black text-base">M</span>
        </div>
        <span className="text-xl font-black text-gray-900 tracking-tight">MediInfo</span>
      </Link>

      {/* Section label */}
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">
        Practice
      </p>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {doctorNavItems.map(item => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-cyan-50 text-cyan-600 border-l-[3px] border-cyan-500'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <span className={active ? 'text-cyan-500' : 'text-gray-400'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer AI tip card */}
      <div className="mx-1 mb-2 mt-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 p-4 text-white">
        <p className="text-xs font-bold mb-0.5">Stay informed.</p>
        <p className="text-[11px] opacity-80 leading-snug">
          AI-powered medicine insights, made for India.
        </p>
      </div>
    </div>
  )
}

function DoctorSidebar() {
  const { isOpen, close } = useSidebar()

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-56 bg-white border-r border-gray-100 flex-col py-6 px-3 fixed top-0 left-0 h-full z-20">
        <DoctorSidebarContent onClose={() => {}} />
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={close}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white z-30 flex flex-col py-6 px-3 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <DoctorSidebarContent onClose={close} />
      </div>
    </>
  )
}

export default DoctorSidebar
