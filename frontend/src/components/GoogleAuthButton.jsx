import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'

function GoogleAuthButton({ role = 'patient', label = 'Continue with Google' }) {
  const handleClick = async () => {
    localStorage.setItem('intended_role', role)

    if (Capacitor.isNativePlatform()) {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'com.niraamo.app://login-callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) {
        console.error('Google sign-in failed:', error)
        return
      }
      await Browser.open({ url: data.url })
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth-callback`,
        },
      })
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 border border-gray-200 py-3 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.3-3.5z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.5 29.5 3.5 24 3.5c-7.5 0-14 4.2-17.7 10.4z"/>
        <path fill="#4CAF50" d="M24 44.5c5.4 0 10.3-1.9 14-5.1l-6.5-5.5c-2 1.4-4.6 2.2-7.5 2.2-5.4 0-9.9-3.1-11.4-7.6l-6.6 5.1C9.9 40.2 16.4 44.5 24 44.5z"/>
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C40.9 36.6 44.5 30.8 44.5 24c0-1.2-.1-2.4-.3-3.5z"/>
      </svg>
      {label}
    </button>
  )
}

export default GoogleAuthButton