import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getMyAppointments, cancelAppointment } from '../api/index'

function MyAppointments() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await getMyAppointments(user.id)
      setAppointments(res.data)
    } catch {
      setAppointments([])
    }
    setLoading(false)
  }

  const handleCancel = async (id) => {
    setCancelling(id)
    try {
      await cancelAppointment(id)
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a)
      )
    } catch {}
    setCancelling(null)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-amber-100 text-amber-700'
    }
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const upcoming = appointments.filter(a => a.status !== 'cancelled' && new Date(a.appointment_date) >= new Date())
  const past = appointments.filter(a => a.status === 'cancelled' || new Date(a.appointment_date) < new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your bookings</p>
          </div>
          <button
            onClick={() => navigate('/doctors')}
            className="bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-cyan-600"
          >
            + Book New
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading appointments...</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
            <p className="text-5xl mb-4">📅</p>
            <p className="text-gray-600 font-medium">No appointments yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Book your first appointment with a doctor</p>
            <button
              onClick={() => navigate('/doctors')}
              className="bg-cyan-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-cyan-600"
            >
              Find a Doctor
            </button>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map(appt => (
                    <div key={appt.id} className="bg-white rounded-2xl shadow-sm p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">Dr. {appt.doctor_name}</h3>
                          <p className="text-cyan-600 text-sm">{appt.specialization}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                            <span>📅 {formatDate(appt.appointment_date)}</span>
                            <span>🕐 {appt.appointment_time}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(appt.status)}`}>
                          {appt.status}
                        </span>
                      </div>
                      {appt.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          disabled={cancelling === appt.id}
                          className="mt-4 w-full border border-red-200 text-red-500 py-2 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancelling === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past / Cancelled */}
            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past & Cancelled</h2>
                <div className="space-y-3">
                  {past.map(appt => (
                    <div key={appt.id} className="bg-white rounded-2xl shadow-sm p-5 opacity-60">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">Dr. {appt.doctor_name}</h3>
                          <p className="text-cyan-600 text-sm">{appt.specialization}</p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                            <span>📅 {formatDate(appt.appointment_date)}</span>
                            <span>🕐 {appt.appointment_time}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(appt.status)}`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyAppointments