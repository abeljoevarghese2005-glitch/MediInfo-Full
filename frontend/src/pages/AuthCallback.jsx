import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleOAuthRedirect } from '../lib/authCallback'

function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    handleOAuthRedirect(window.location.href)
      .then((profile) => {
        if (!profile.phone) {
          navigate('/complete-profile')
        } else if (profile.role === 'doctor') {
          navigate('/doctor-dashboard')
        } else {
          navigate('/home')
        }
      })
      .catch((err) => {
        console.error('OAuth callback failed:', err)
        setError('Google sign-in failed. Please try again.')
        setTimeout(() => navigate('/login'), 2000)
      })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">
      {error || 'Signing you in...'}
    </div>
  )
}

export default AuthCallback