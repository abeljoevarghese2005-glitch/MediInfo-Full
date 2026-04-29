import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { getMyAppointments, cancelAppointment } from '../api/index'

const TRAVEL_OPTIONS = ['10m', '15m', '20m', '30m']

const avatarColors = [
  'bg-cyan-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-blue-500'
]
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Live Queue View ──────────────────────────────────────────────
function LiveQueueView({ appointment, onBack, onCancel, cancelling }) {
  const [travelTime, setTravelTime] = useState('20m')
  const [customMinutes, setCustomMinutes] = useState('')
  const [notified, setNotified] = useState(false)

  // Mock queue data (in production this would come from a websocket/polling)
  const queuePosition = 4
  const waitMinutes = queuePosition * 6
  const totalSlots = 12
  const progress = Math.round(((totalSlots - queuePosition) / totalSlots) * 100)

  const handleNotify = () => setNotified(true)

  return (
    <div className="flex-1 px-6 py-6 max-w-xl mx-auto w-full">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* ── Queue Status Card ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4 text-center">
        <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-3">
          You're in the queue
        </p>

        <div className="text-7xl font-black text-cyan-500 leading-none mb-2">
          {queuePosition}
        </div>
        <p className="text-gray-500 text-sm mb-4">{queuePosition} patients before you</p>

        <p className="text-xl font-black text-gray-900 mb-1">
          Approx. {waitMinutes} min wait
        </p>
        <p className="text-gray-400 text-xs mb-5">based on current pace</p>

        <div className="flex items-center justify-center gap-1.5 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-500 text-xs font-semibold">Doctor is on time</span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span>Checked in</span>
            <span>Your turn</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-cyan-500 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Guidance Message ── */}
      <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 mb-4">
        <p className="font-bold text-gray-800 text-sm mb-0.5">Relax, you still have time</p>
        <p className="text-gray-500 text-xs">We will let you know when to start moving.</p>
      </div>

      {/* ── Travel Time Selector ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <p className="font-bold text-gray-800 text-sm">Set your travel time</p>
        </div>
        <p className="text-gray-400 text-xs mb-3 ml-6">Tap to select — saved instantly.</p>

        <div className="flex gap-2 mb-3">
          {TRAVEL_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => { setTravelTime(opt); setCustomMinutes('') }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                travelTime === opt && !customMinutes
                  ? 'bg-cyan-500 text-white shadow-sm scale-105'
                  : 'border border-gray-200 text-gray-600 hover:border-cyan-300 hover:text-cyan-500'
              }`}
            >
              {travelTime === opt && !customMinutes ? `✓ ${opt}` : opt}
            </button>
          ))}
        </div>

        <input
          type="number"
          min="1"
          max="120"
          value={customMinutes}
          onChange={e => { setCustomMinutes(e.target.value); setTravelTime('') }}
          placeholder="Or enter custom minutes"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-gray-300"
        />
      </div>

      {/* ── CTA ── */}
      <button
        onClick={handleNotify}
        className={`w-full py-4 rounded-2xl font-bold text-sm mb-2 transition-all ${
          notified
            ? 'bg-green-500 text-white'
            : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-600 hover:to-cyan-500 shadow-md'
        }`}
      >
        {notified ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            You'll be notified!
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Tell me exactly when to leave
          </span>
        )}
      </button>
      <p className="text-center text-gray-400 text-xs mb-5">
        We'll notify you before your turn — no need to keep checking.
      </p>

      {/* ── Doctor Info Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 ${getColor(appointment.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {getInitials(appointment.doctor_name)}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{appointment.doctor_name}</p>
            <p className="text-cyan-500 text-xs font-medium">{appointment.specialization}</p>
            {appointment.clinic_name && (
              <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {appointment.clinic_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Secondary Actions ── */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button className="py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
          Reschedule
        </button>
        <button
          onClick={() => onCancel(appointment.id)}
          disabled={cancelling === appointment.id}
          className="py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {cancelling === appointment.id ? 'Cancelling...' : 'Cancel'}
        </button>
      </div>
    </div>
  )
}

// ── Appointments List View ───────────────────────────────────────
function AppointmentsList({ appointments, loading, navigate, onJoinQueue, onCancel, cancelling }) {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-amber-100 text-amber-700'
    }
  }

  const upcoming = appointments.filter(a => a.status !== 'cancelled' && a.appointment_date >= new Date().toISOString().split('T')[0])
  const past = appointments.filter(a => a.status === 'cancelled' || a.appointment_date < new Date().toISOString().split('T')[0])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
      Loading appointments...
    </div>
  )

  if (appointments.length === 0) return (
    <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-gray-700 font-bold mb-1">No appointments yet</p>
      <p className="text-gray-400 text-sm mb-5 text-center">Book your first appointment with a doctor</p>
      <button
        onClick={() => navigate('/doctors')}
        className="bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600"
      >
        Find a Doctor
      </button>
    </div>
  )

  return (
    <div className="flex-1 px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Live Queue</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track and manage your appointments</p>
        </div>
        <button
          onClick={() => navigate('/doctors')}
          className="bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600"
        >
          + Book New
        </button>
      </div>

      <div className="space-y-6 max-w-2xl">
        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map(appt => (
                <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {getInitials(appt.doctor_name)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{appt.doctor_name}</p>
                        <p className="text-cyan-500 text-xs">{appt.specialization}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>📅 {formatDate(appt.appointment_date)}</span>
                          <span>🕐 {appt.appointment_time}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusStyle(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>

                  {/* Join Queue button for today's appointments */}
                  {appt.appointment_date === new Date().toISOString().split('T')[0] && appt.status !== 'cancelled' && (
                    <button
                      onClick={() => onJoinQueue(appt)}
                      className="w-full bg-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      Join Live Queue
                    </button>
                  )}

                  {appt.status !== 'cancelled' && appt.appointment_date !== new Date().toISOString().split('T')[0] && (
                    <button
                      onClick={() => onCancel(appt.id)}
                      disabled={cancelling === appt.id}
                      className="w-full border border-red-200 text-red-500 py-2 rounded-xl text-sm hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancelling === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Past & Cancelled</p>
            <div className="space-y-3">
              {past.map(appt => (
                <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                        {getInitials(appt.doctor_name)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{appt.doctor_name}</p>
                        <p className="text-cyan-500 text-xs">{appt.specialization}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>📅 {formatDate(appt.appointment_date)}</span>
                          <span>🕐 {appt.appointment_time}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusStyle(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
function MyAppointments() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [activeQueue, setActiveQueue] = useState(null) // appointment being tracked in queue

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
      if (activeQueue?.id === id) setActiveQueue(null)
    } catch {}
    setCancelling(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar />

        {activeQueue ? (
          <LiveQueueView
            appointment={activeQueue}
            onBack={() => setActiveQueue(null)}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        ) : (
          <AppointmentsList
            appointments={appointments}
            loading={loading}
            navigate={navigate}
            onJoinQueue={setActiveQueue}
            onCancel={handleCancel}
            cancelling={cancelling}
          />
        )}
      </div>
    </div>
  )
}

export default MyAppointments
