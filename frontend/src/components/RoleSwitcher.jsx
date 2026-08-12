import { useNavigate } from 'react-router-dom'

function RoleSwitcher({ activeRole }) {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (!user.hasPatientProfile || !user.hasDoctorProfile) return null

  const switchTo = (role) => {
    localStorage.setItem('user', JSON.stringify({ ...user, role }))
    navigate(role === 'doctor' ? '/doctor-dashboard' : '/home', { replace: true })
  }

  return (
    <div className="flex items-center rounded-xl border border-gray-200 p-0.5 gap-0.5 mr-1">
      <button
        onClick={() => switchTo('patient')}
        disabled={activeRole === 'patient'}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          activeRole === 'patient' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Patient
      </button>
      <button
        onClick={() => switchTo('doctor')}
        disabled={activeRole === 'doctor'}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          activeRole === 'doctor' ? 'bg-cyan-500 text-white' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        Doctor
      </button>
    </div>
  )
}

export default RoleSwitcher