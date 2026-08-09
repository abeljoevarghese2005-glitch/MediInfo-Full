import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebar } from './SidebarContext'
import { supabase } from '../lib/supabase'
import niraamoLogo from '../assets/niraamo-logo-final.png'

function TopBar() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const { open } = useSidebar()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/', { replace: true })
  }

  return (
    <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-green-50 border-b border-gray-100 sticky top-0 z-10">
      <button onClick={open} className="text-gray-500 hover:text-gray-700 lg:hidden p-1" aria-label={t('topBar.openMenu')}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <Link to="/home" className="flex items-center gap-2 lg:hidden">
        <img src={niraamoLogo} alt="Niraamo" className="w-7 h-7 rounded-lg" />
        <span className="text-base font-semibold tracking-tight text-gray-900">Niraamo</span>
      </Link>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-2 sm:gap-4">
        <Link to="/ai-chat" className="flex items-center gap-2 bg-green-50 text-emerald-700 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-green-100 hover:text-emerald-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className="hidden sm:inline">{t('topBar.aiChat')}</span>
        </Link>
        <Link to="/profile" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm shrink-0">
            {user.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium text-gray-700 hidden md:block">{user.full_name}</span>
        </Link>
        <button onClick={handleLogout} className="text-gray-400 transition-colors hover:text-red-500" title={t('common.logout')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TopBar