import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { getMyAppointments } from '../api/index'

const TRAVEL_OPTIONS = ['10m', '15m', '20m', '30m']

const avatarColors = [
  'bg-cyan-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-blue-500'
]
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'

function LiveQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const [appointment, setAppointment] = useState(location.state?.appointment || null)
  const [loading, setLoading] = useState(!location.state?.appointment)
  const [travelTime, setTravelTime] = useState('20m')
  const [customMinutes, setCustomMinutes] = useState('')
  const [notified, setNotified] = useState(false)

  const queuePosition = 4
  const waitMinutes = queuePosition * 6
  const totalSlots = 12
  const progress = Math.round(((totalSlots - queuePosition) / totalSlots) * 100)

  useEffect(() => {
    // If no appointment passed via navigation state, auto-fetch the next upcoming one
    if (!location.state?.appointment) {
      fetchNextAppointment()
    }
  }, [])

  const fetchNextAppointment = async () => {
    setLoading(true)
    try {
      const res = await getMyAppointments(user.id)
      const today = new Date().toISOString().split('T')[0]
      // Get the soonest upcoming non-cancelled appointment
      const upcoming = res.data
        .filter(a => a.status !== 'cancelled' && a.appointment_date >= today)
        .sort((a, b) => {
          // Sort by date then time
          if (a.appointment_date !== b.appointment_date) {
            return a.appointment_date.localeCompare(b.appointment_date)
          }
          return a.appointment_time.localeCompare(b.appointment_time)
        })
      setAppointment(upcoming[0] || null)
    } catch {
      setAppointment(null)
    }
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="lg:ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading queue...
        </div>
      </div>
    </div>
  )

  if (!appointment) return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="lg:ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-8">
          <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-700 font-bold mb-1">No upcoming appointments</p>
          <p className="text-gray-400 text-sm mb-5 text-center">Book an appointment to join the live queue</p>
          <button
            onClick={() => navigate('/doctors')}
            className="bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600"
          >
            Book a Doctor
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="lg:ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 py-6">

            {/* Back */}
            <button
              onClick={() => navigate('/my-appointments')}
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
              <p className="text-xl font-black text-gray-900 mb-1">Approx. {waitMinutes} min wait</p>
              <p className="text-gray-400 text-xs mb-5">based on current pace</p>
              <div className="flex items-center justify-center gap-1.5 mb-6">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-500 text-xs font-semibold">Doctor is on time</span>
              </div>
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
              onClick={() => setNotified(true)}
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
                  <p className="text-cyan-500 text-xs font-medium">{appointment.specialization || 'General Physician'}</p>
                  {appointment.clinic_name && (
                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {appointment.clinic_name}
                    </p>
                  )}
                  <p className="text-gray-400 text-xs mt-0.5">
                    📅 {appointment.appointment_date} &nbsp;🕐 {appointment.appointment_time}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Secondary Actions ── */}
            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors">
                Reschedule
              </button>
              <button
                onClick={() => navigate('/my-appointments')}
                className="py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveQueue
