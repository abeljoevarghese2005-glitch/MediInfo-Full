import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

const avatarColors = ['bg-cyan-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'
const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function generateSlots(start, end, duration = 15) {
  const slots = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let current = sh * 60 + sm
  const endMin = eh * 60 + em
  while (current + duration <= endMin) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    current += duration
  }
  return slots
}

function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-xs
            ${t.type === 'confirmed' ? 'bg-green-500 text-white' : t.type === 'cancelled' ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'}`}>
          <span className="text-base leading-none mt-0.5">
            {t.type === 'confirmed' ? '✅' : t.type === 'cancelled' ? '❌' : 'ℹ️'}
          </span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 leading-none mt-0.5">✕</button>
        </div>
      ))}
    </div>
  )
}

function RescheduleModal({ appointment, onClose, onSuccess, addToast }) {
  const today = new Date().toISOString().split('T')[0]
  const [newDate, setNewDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])
  const [newTime, setNewTime] = useState('')
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (newDate) fetchSlots(newDate)
    else { setAvailableSlots([]); setBookedSlots([]) }
  }, [newDate])

  const fetchSlots = async (date) => {
    setSlotsLoading(true)
    setNewTime('')
    try {
      const [year, month, day] = date.split('-').map(Number)
      const dayName = DAYS[new Date(year, month - 1, day).getDay()]
      const { data: avail } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time, slot_duration')
        .eq('doctor_id', appointment.doctor_id)
        .eq('day_of_week', dayName)
        .eq('is_available', true)
        .single()

      if (!avail) { setAvailableSlots([]); setSlotsLoading(false); return }

      const slots = generateSlots(
        avail.start_time.slice(0, 5),
        avail.end_time.slice(0, 5),
        avail.slot_duration || 15
      )
      setAvailableSlots(slots)

      const { data: existing } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', appointment.doctor_id)
        .eq('appointment_date', date)
        .neq('id', appointment.id)
        .in('status', ['pending', 'confirmed', 'accepted'])

      setBookedSlots(existing ? existing.map(a => a.appointment_time.slice(0, 5)) : [])
    } catch {
      setAvailableSlots([])
    }
    setSlotsLoading(false)
  }

  const handleReschedule = async () => {
    if (!newDate || !newTime) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate,
          appointment_time: newTime,
          status: 'pending',
        })
        .eq('id', appointment.id)

      if (error) throw error
      addToast(`Appointment rescheduled to ${formatDate(newDate)} at ${newTime}. A rescheduling fee may apply.`, 'info')
      onSuccess()
      onClose()
    } catch (err) {
      addToast('Failed to reschedule. Please try again.', 'cancelled')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-800 text-lg">Reschedule Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
          ⚠️ Rescheduling resets your appointment to pending. A rescheduling fee may be deducted by the clinic.
        </div>

        <div className="flex items-center gap-3 bg-cyan-50 rounded-xl p-3 mb-4">
          <div className={`w-10 h-10 ${getColor(appointment.doctor_name)} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
            {getInitials(appointment.doctor_name)}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{appointment.doctor_name}</p>
            <p className="text-cyan-600 text-xs">{appointment.specialization || 'General Physician'}</p>
            <p className="text-gray-400 text-xs">Currently: {formatDate(appointment.appointment_date)} at {appointment.appointment_time}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">New Date</label>
          <input type="date" min={today} value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 text-sm" />
        </div>

        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 mb-2 block">New Time Slot</label>
          {!newDate ? (
            <p className="text-gray-400 text-xs">Select a date first</p>
          ) : slotsLoading ? (
            <p className="text-gray-400 text-xs">Loading slots...</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-red-400 text-xs">No availability on this day</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map(slot => {
                const isBooked = bookedSlots.includes(slot)
                const isSelected = newTime === slot
                return (
                  <button key={slot} disabled={isBooked}
                    onClick={() => !isBooked && setNewTime(slot)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      isBooked ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : isSelected ? 'bg-cyan-500 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-cyan-50'
                    }`}>
                    {slot}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button onClick={handleReschedule} disabled={saving || !newDate || !newTime}
          className="w-full bg-cyan-500 text-white py-3 rounded-xl font-bold hover:bg-cyan-600 disabled:opacity-60">
          {saving ? 'Rescheduling...' : '📅 Confirm Reschedule'}
        </button>
      </div>
    </div>
  )
}

function MyAppointments() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [toasts, setToasts] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const prevAppointments = useRef([])
  const toastCounter = useRef(0)

  const addToast = (message, type = 'info') => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, doctor_id, patient_id, appointment_date, appointment_time,
        status, issue, created_at,
        users!appointments_doctor_id_fkey(full_name, specialization)
      `)
      .eq('patient_id', user.id)
      .order('appointment_date', { ascending: false })

    if (error || !data) { setLoading(false); return }

    const normalized = data.map(a => ({
      ...a,
      doctor_name: a.users?.full_name,
      specialization: a.users?.specialization,
    }))

    if (prevAppointments.current.length > 0) {
      normalized.forEach(newAppt => {
        const old = prevAppointments.current.find(a => a.id === newAppt.id)
        if (!old || old.status === newAppt.status) return
        const doc = newAppt.doctor_name || 'your doctor'
        if (newAppt.status === 'confirmed')
          addToast(`Your appointment with ${doc} has been confirmed! 🎉`, 'confirmed')
        else if (newAppt.status === 'cancelled')
          addToast(`Your appointment with ${doc} was cancelled by the clinic.`, 'cancelled')
      })
    }

    prevAppointments.current = normalized
    setAppointments(normalized)
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `patient_id=eq.${user.id}`,
      }, () => { fetchAppointments() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleCancel = async (id) => {
    setCancelling(id)
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
    if (!error) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    }
    setCancelling(null)
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = appointments.filter(a => a.status !== 'cancelled' && a.appointment_date >= today)
  const past = appointments.filter(a => a.status === 'cancelled' || a.appointment_date < today)

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-amber-100 text-amber-700'
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
        <Sidebar />
        <Toast toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        {rescheduling && (
          <RescheduleModal
            appointment={rescheduling}
            onClose={() => setRescheduling(null)}
            onSuccess={fetchAppointments}
            addToast={addToast}
          />
        )}
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />
          <div className="flex-1 px-4 sm:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900">My Appointments</h1>
                <p className="text-gray-400 text-sm mt-0.5">Manage all your bookings</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live
                  {lastUpdated && (
                    <span className="hidden sm:inline">
                      · {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button onClick={() => navigate('/doctors')}
                  className="bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600">
                  + Book New
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-bold mb-1">No appointments yet</p>
                <p className="text-gray-400 text-sm mb-5">Book your first appointment with a doctor</p>
                <button onClick={() => navigate('/doctors')}
                  className="bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600">
                  Find a Doctor
                </button>
              </div>
            ) : (
              <div className="space-y-6 max-w-2xl">
                {upcoming.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Upcoming</p>
                    <div className="space-y-3">
                      {upcoming.map(appt => (
                        <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                {getInitials(appt.doctor_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{appt.doctor_name}</p>
                                <p className="text-cyan-500 text-xs">{appt.specialization || 'General Physician'}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                                  <span>📅 {formatDate(appt.appointment_date)}</span>
                                  <span>🕐 {appt.appointment_time}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ml-2 ${getStatusStyle(appt.status)}`}>
                              {appt.status}
                            </span>
                          </div>
                          {appt.status === 'confirmed' ? (
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => navigate('/live-queue', { state: { appointment: appt } })}
                                className="flex-1 min-w-[120px] bg-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600 flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                Join Live Queue
                              </button>
                              <button onClick={() => setRescheduling(appt)}
                                className="px-4 py-2.5 rounded-xl border border-cyan-200 text-cyan-600 text-sm font-semibold hover:bg-cyan-50">
                                Reschedule
                              </button>
                              <button onClick={() => handleCancel(appt.id)} disabled={cancelling === appt.id}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                                {cancelling === appt.id ? '...' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 items-center">
                              <div className="flex-1 min-w-[120px] flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-600 py-2.5 px-4 rounded-xl text-sm font-medium">
                                ⏳ Awaiting approval
                              </div>
                              <button onClick={() => setRescheduling(appt)}
                                className="px-4 py-2.5 rounded-xl border border-cyan-200 text-cyan-600 text-sm font-semibold hover:bg-cyan-50">
                                Reschedule
                              </button>
                              <button onClick={() => handleCancel(appt.id)} disabled={cancelling === appt.id}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                                {cancelling === appt.id ? '...' : 'Cancel'}
                              </button>
                            </div>
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
                              <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                {getInitials(appt.doctor_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{appt.doctor_name}</p>
                                <p className="text-cyan-500 text-xs">{appt.specialization || 'General Physician'}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                                  <span>📅 {formatDate(appt.appointment_date)}</span>
                                  <span>🕐 {appt.appointment_time}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ml-2 ${getStatusStyle(appt.status)}`}>
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
      </div>
    </SidebarProvider>
  )
}

export default MyAppointments