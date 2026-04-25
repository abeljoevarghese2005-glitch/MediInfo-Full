import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { getDoctorAppointments, confirmAppointment, rejectAppointment } from '../api/index'

function DoctorDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (user.role !== 'doctor') {
      navigate('/home')
      return
    }
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await getDoctorAppointments(user.id)
      setAppointments(res.data)
    } catch {
      setAppointments([])
    }
    setLoading(false)
  }

  const handleConfirm = async (id) => {
    setActing(id)
    try {
      await confirmAppointment(id)
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a)
      )
    } catch {}
    setActing(null)
  }

  const handleReject = async (id) => {
    setActing(id)
    try {
      await rejectAppointment(id)
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a)
      )
    } catch {}
    setActing(null)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-amber-100 text-amber-700'
    }
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  const filtered = appointments.filter(a => {
    if (filter === 'pending') return a.status === 'pending'
    if (filter === 'confirmed') return a.status === 'confirmed'
    if (filter === 'cancelled') return a.status === 'cancelled'
    return true
  })

  const pendingCount = appointments.filter(a => a.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="px-10 py-8">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Doctor Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Welcome, {user.full_name} · {user.specialization || 'General Physician'}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-amber-500">{appointments.filter(a => a.status === 'pending').length}</p>
              <p className="text-xs text-gray-500 mt-1">Pending</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{appointments.filter(a => a.status === 'confirmed').length}</p>
              <p className="text-xs text-gray-500 mt-1">Confirmed</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-cyan-500">{appointments.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            {['all', 'pending', 'confirmed', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  filter === f
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f} {f === 'pending' && pendingCount > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Appointments */}
          {loading ? (
            <div className="text-center py-16 text-gray-400">Loading appointments...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm max-w-2xl">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-gray-500">No {filter === 'all' ? '' : filter} appointments</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">
              {filtered.map(appt => (
                <div key={appt.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{appt.patient_name}</h3>
                      <p className="text-gray-400 text-sm">📞 {appt.patient_phone}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span>📅 {formatDate(appt.appointment_date)}</span>
                        <span>🕐 {appt.appointment_time}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>

                  {appt.status === 'pending' && (
                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => handleConfirm(appt.id)}
                        disabled={acting === appt.id}
                        className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-green-600 disabled:opacity-50"
                      >
                        {acting === appt.id ? '...' : '✅ Confirm'}
                      </button>
                      <button
                        onClick={() => handleReject(appt.id)}
                        disabled={acting === appt.id}
                        className="flex-1 border border-red-200 text-red-500 py-2 rounded-xl text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                      >
                        {acting === appt.id ? '...' : '❌ Reject'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DoctorDashboard