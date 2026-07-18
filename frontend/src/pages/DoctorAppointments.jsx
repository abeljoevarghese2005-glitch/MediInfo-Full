import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import PrescriptionModal from '../components/PrescriptionModal'
import { supabase } from '../lib/supabase'

function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-xs ${t.type === 'error' ? 'bg-red-500' : 'bg-cyan-600'} text-white`}>
          <span className="text-base leading-none mt-0.5">{t.type === 'error' ? '⚠️' : '🔔'}</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 leading-none mt-0.5">✕</button>
        </div>
      ))}
    </div>
  )
}

function CancelModal({ appointment, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const presets = [
    'Emergency came up',
    'Doctor unwell today',
    'Clinic closed unexpectedly',
    'Rescheduling required',
  ]

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    await onConfirm(appointment.id, reason.trim())
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900">Cancel Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="bg-red-50 rounded-xl px-4 py-3 text-sm">
          <p className="font-semibold text-gray-800">{appointment.patient_name}</p>
          <p className="text-gray-400 text-xs mt-0.5">{appointment.appointment_date} · {appointment.appointment_time}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reason for cancellation</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {presets.map(p => (
              <button key={p} onClick={() => setReason(p)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${reason === p ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                {p}
              </button>
            ))}
          </div>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Or type a custom reason…" rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
        </div>
        <p className="text-xs text-gray-400">The patient will be notified with this reason.</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50">
            Keep Appointment
          </button>
          <button onClick={handleSubmit} disabled={!reason.trim() || submitting}
            className="flex-1 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
            {submitting ? 'Cancelling…' : 'Cancel & Notify Patient'}
          </button>
        </div>
      </div>
    </div>
  )
}

function WalkInModal({ doctorId, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [time, setTime] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [dayDisabled, setDayDisabled] = useState(false)

  const todayIST = new Date().toLocaleDateString('en-CA')

  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  useEffect(() => {
    fetchAvailabilityAndBuildSlots()
  }, [])

  // Pulls the doctor's current availability fresh from the database every
  // time the modal opens, so edits made in "Update Availability" are
  // reflected immediately the next time a walk-in is added.
  //
  // IMPORTANT: `users.availability` is stored as a JSON *string* (the
  // profile page saves it via JSON.stringify), not a JSON/jsonb object —
  // it must be parsed before indexing into it by day name, otherwise every
  // lookup silently returns undefined and the modal always falls back to
  // "no availability set", regardless of what the doctor actually saved.
  const fetchAvailabilityAndBuildSlots = async () => {
    setLoadingSlots(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('availability')
        .eq('id', doctorId)
        .single()

      if (fetchError) throw fetchError

      let parsedAvailability = null
      if (data?.availability) {
        try {
          parsedAvailability = typeof data.availability === 'string'
            ? JSON.parse(data.availability)
            : data.availability // already an object, in case the column type changes later
        } catch {
          parsedAvailability = null
        }
      }

      const dayKey = DAY_KEYS[new Date().getDay()]
      const dayConfig = parsedAvailability?.[dayKey]

      if (!dayConfig || !dayConfig.enabled || !Array.isArray(dayConfig.ranges) || dayConfig.ranges.length === 0) {
        setDayDisabled(true)
        setSlots([])
        setLoadingSlots(false)
        return
      }

      setDayDisabled(false)
      setSlots(generateSlotsFromRanges(dayConfig.ranges))
    } catch (err) {
      setDayDisabled(true)
      setSlots([])
    }
    setLoadingSlots(false)
  }

  // Builds 15-minute slots across one or more time ranges for today,
  // skipping any slot earlier than right now, and handling a range that
  // crosses midnight (e.g. start "20:00" end "00:00" meaning "until midnight").
  const generateSlotsFromRanges = (ranges) => {
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + Math.ceil(now.getMinutes() / 15) * 15
    const allSlots = new Set()

    ranges.forEach(({ start, end }) => {
      if (!start || !end) return
      const [startH, startM] = start.split(':').map(Number)
      const [endH, endM] = end.split(':').map(Number)
      let startMinutes = startH * 60 + startM
      let endMinutes = endH * 60 + endM

      if (endMinutes <= startMinutes) {
        endMinutes = 24 * 60
      }

      const effectiveStart = Math.max(startMinutes, nowMinutes)

      for (let m = effectiveStart; m < endMinutes; m += 15) {
        const h = Math.floor(m / 60)
        const min = m % 60
        if (h >= 24) break
        allSlots.add(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
      }
    })

    return Array.from(allSlots).sort()
  }

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Patient name is required'); return }
    if (!age || isNaN(age) || age < 1 || age > 120) { setError('Enter a valid age'); return }
    if (!phone.trim() || phone.length < 10) { setError('Enter a valid phone number'); return }
    if (!time) { setError('Please select a time slot'); return }
    setSubmitting(true)
    setError('')
    try {
      const { error: insertError } = await supabase.from('appointments').insert({
        doctor_id: doctorId,
        patient_id: null,
        appointment_date: todayIST,
        appointment_time: time,
        status: 'confirmed',
        source: 'walkin',
        walkin_name: name.trim(),
        walkin_age: parseInt(age, 10),
        walkin_phone: phone.trim(),
      })
      if (insertError) throw insertError
      onSuccess(`Walk-in patient "${name.trim()}" added for ${time}`)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add walk-in patient')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900">Add Walk-in Patient</h2>
            <p className="text-xs text-gray-400 mt-0.5">Today · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Patient Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Age *</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 35" min={1} max={120}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Phone *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Time Slot *</label>
            {loadingSlots ? (
              <p className="text-xs text-gray-400">Loading available slots…</p>
            ) : dayDisabled ? (
              <p className="text-xs text-red-400">You haven't set your availability for today. Update it in your profile to add walk-ins.</p>
            ) : slots.length === 0 ? (
              <p className="text-xs text-red-400">No slots remaining for today</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                {slots.map(s => (
                  <button key={s} onClick={() => setTime(s)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${time === s ? 'bg-cyan-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-cyan-50'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs">❌ {error}</div>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 py-2.5 bg-cyan-500 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition-colors">
            {submitting ? 'Adding…' : 'Add Patient'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailModal({ appointment, onClose }) {
  if (!appointment) return null
  const statusStyles = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-gray-100 text-gray-500',
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900">Appointment Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-cyan-50 rounded-xl p-4">
            <div className="w-12 h-12 rounded-full bg-cyan-200 text-cyan-700 font-black text-lg flex items-center justify-center shrink-0">
              {appointment.patient_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-bold text-gray-900">{appointment.patient_name || 'Walk-in Patient'}</p>
              {appointment.source === 'walkin' && (
                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Walk-in</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Date</p>
              <p className="text-sm font-semibold text-gray-800">
                {new Date(appointment.appointment_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Time</p>
              <p className="text-sm font-semibold text-gray-800">{appointment.appointment_time}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Type</p>
              <p className="text-sm font-semibold text-gray-800 capitalize">{appointment.source === 'walkin' ? 'Walk-in' : 'Booked'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Status</p>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusStyles[appointment.status] || 'bg-gray-100 text-gray-500'}`}>
                {appointment.status === 'confirmed' ? 'Accepted' : appointment.status}
              </span>
            </div>
          </div>
          {appointment.issue && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Issue / Notes</p>
              <p className="text-sm text-gray-700">{appointment.issue}</p>
            </div>
          )}
          {appointment.source === 'walkin' && (
            <div className="bg-orange-50 rounded-xl p-3 space-y-1">
              <p className="text-xs text-gray-400 mb-1">Walk-in Info</p>
              <p className="text-sm text-gray-700">Age: {appointment.walkin_age}</p>
              <p className="text-sm text-gray-700">Phone: {appointment.walkin_phone}</p>
            </div>
          )}
          {appointment.status === 'cancelled' && appointment.cancellation_reason && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Cancellation Reason</p>
              <p className="text-sm text-red-600">{appointment.cancellation_reason}</p>
            </div>
          )}
        </div>
        <button onClick={onClose}
          className="w-full py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50">
          Close
        </button>
      </div>
    </div>
  )
}

function DoctorAppointments() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [prescribeTarget, setPrescribeTarget] = useState(null)
  const [detailTarget, setDetailTarget] = useState(null)
  // ✅ NEW: ticks every 30s so the "Join Video Consultation" button's join
  // window (5 min before -> appointment end) updates live without a refresh.
  // Mirrors the same pattern used on the patient side in MyAppointments.jsx.
  const [now, setNow] = useState(new Date())
  const prevAppointments = useRef([])
  const toastCounter = useRef(0)

  const addToast = (message, type = 'info') => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }

  // ✅ NEW: true when this is a video appointment and we're within
  // [appointment_time - 5min, appointment_time + duration_minutes].
  const isVideoJoinable = (appt, referenceNow) => {
    if (appt.consultation_type !== 'video') return false
    if (!appt.appointment_date || !appt.appointment_time) return false
    const [h, m] = appt.appointment_time.split(':').map(Number)
    const apptDateTime = new Date(`${appt.appointment_date}T00:00:00`)
    apptDateTime.setHours(h, m, 0, 0)
    const durationMinutes = appt.duration_minutes || 15
    const windowStart = new Date(apptDateTime.getTime() - 5 * 60000)
    const windowEnd = new Date(apptDateTime.getTime() + durationMinutes * 60000)
    return referenceNow >= windowStart && referenceNow <= windowEnd
  }

  const fetchAppointments = async () => {
    const todayIST = new Date().toLocaleDateString('en-CA')
    const limit = new Date()
    limit.setDate(limit.getDate() + 30)
    const limitIST = limit.toLocaleDateString('en-CA')

    const windowQuery = supabase
      .from('appointments')
      .select('*, users!appointments_patient_id_fkey(full_name)')
      .eq('doctor_id', user.id)
      .gte('appointment_date', todayIST)
      .lte('appointment_date', limitIST)
      .order('appointment_date', { ascending: true })

    const pendingQuery = supabase
      .from('appointments')
      .select('*, users!appointments_patient_id_fkey(full_name)')
      .eq('doctor_id', user.id)
      .eq('status', 'pending')
      .order('appointment_date', { ascending: true })

    const [{ data, error }, { data: pendingData, error: pendingError }] = await Promise.all([windowQuery, pendingQuery])

    if (error || !data) { setLoading(false); return }

    const combined = [...data]
    if (!pendingError && pendingData) {
      const existingIds = new Set(data.map(a => a.id))
      pendingData.forEach(p => { if (!existingIds.has(p.id)) combined.push(p) })
    }

    const normalized = combined.map(a => ({
      ...a,
      patient_name: a.source === 'walkin' ? a.walkin_name : a.users?.full_name,
    }))

    if (prevAppointments.current.length > 0) {
      const prevIds = new Set(prevAppointments.current.map(a => a.id))
      const newRequests = normalized.filter(a => !prevIds.has(a.id) && a.status === 'pending')
      if (newRequests.length === 1)
        addToast(`New appointment request from ${newRequests[0].patient_name}`)
      else if (newRequests.length > 1)
        addToast(`${newRequests.length} new appointment requests received`)
    }

    prevAppointments.current = normalized
    setAppointments(normalized)
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchAppointments()

    const channel = supabase
      .channel('doctor-appts-list')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `doctor_id=eq.${user.id}`,
      }, () => fetchAppointments())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // ✅ NEW: keep `now` fresh so the video join-window check stays accurate
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirm = async (id) => {
    setActing(id)
    const { error } = await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id)
    if (!error) setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a))
    setActing(null)
  }

  const handleReject = async (id) => {
    setActing(id)
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
    if (!error) setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    setActing(null)
  }

  const handleCancelConfirmed = async (id, reason) => {
    setActing(id)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', cancellation_reason: reason })
        .eq('id', id)
      if (error) throw error
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled', cancellation_reason: reason } : a))
      addToast('Appointment cancelled.')
      setCancelTarget(null)
    } catch (err) {
      console.error('Cancel error:', err)
      addToast('Failed to cancel appointment. Please try again.', 'error')
    }
    setActing(null)
  }

  const statusStyles = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-gray-100 text-gray-500',
  }

  const todayStr = new Date().toLocaleDateString('en-CA')
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA')
  const weekEndDate = new Date()
  weekEndDate.setDate(weekEndDate.getDate() + 7)
  const weekEndStr = weekEndDate.toLocaleDateString('en-CA')

  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length
  const completedCount = appointments.filter(a => a.status === 'completed').length

  const displayed = appointments.filter(a => {
    if (dateFilter === 'today' && a.appointment_date !== todayStr) return false
    if (dateFilter === 'tomorrow' && a.appointment_date !== tomorrowStr) return false
    if (dateFilter === 'week' && (a.appointment_date < todayStr || a.appointment_date > weekEndStr)) return false
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchName = a.patient_name?.toLowerCase().includes(q)
      const matchIssue = (a.issue || '').toLowerCase().includes(q)
      if (!matchName && !matchIssue) return false
    }
    return true
  })

  const dayLabel = (dateStr) => {
    if (dateStr === todayStr) return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    if (!dateStr) return 'No date set'
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  const groups = displayed.reduce((acc, appt) => {
    const key = appt.appointment_date || 'no-date'
    if (!acc[key]) acc[key] = []
    acc[key].push(appt)
    return acc
  }, {})
  const sortedDates = Object.keys(groups).sort()

  const dateFilterTabs = [
    { key: 'all', label: 'All Dates' },
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'week', label: 'This Week' },
  ]

  const statusFilterTabs = [
    { key: 'all', label: `All (${appointments.length})` },
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'confirmed', label: `Accepted (${confirmedCount})` },
    { key: 'completed', label: `Completed (${completedCount})` },
    { key: 'cancelled', label: `Cancelled (${cancelledCount})` },
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <Toast toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

        {cancelTarget && (
          <CancelModal appointment={cancelTarget} onConfirm={handleCancelConfirmed} onClose={() => setCancelTarget(null)} />
        )}
        {showWalkIn && (
          <WalkInModal doctorId={user.id} onClose={() => setShowWalkIn(false)}
            onSuccess={(msg) => { addToast(msg); fetchAppointments() }} />
        )}
        {prescribeTarget && (
          <PrescriptionModal
            appointment={prescribeTarget}
            onClose={() => setPrescribeTarget(null)}
            onSaved={(msg) => { addToast(msg) }}
          />
        )}
        {detailTarget && (
          <DetailModal appointment={detailTarget} onClose={() => setDetailTarget(null)} />
        )}

        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-gray-900">Appointments</h1>
                <p className="text-sm text-gray-400">Upcoming bookings for the next 30 days</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowWalkIn(true)}
                  className="flex items-center gap-1.5 text-sm bg-cyan-500 text-white px-4 py-2 rounded-xl hover:bg-cyan-600 transition-colors font-semibold">
                  + Walk-in
                </button>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live
                  {lastUpdated && (
                    <span className="hidden sm:inline">
                      · {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button onClick={fetchAppointments}
                  className="text-sm border border-gray-200 bg-white text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  Refresh
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4 max-w-lg">
              {[
                { label: 'Total', value: appointments.length, color: 'text-gray-800' },
                { label: 'Accepted', value: confirmedCount, color: 'text-green-500' },
                { label: 'Pending', value: pendingCount, color: 'text-amber-500' },
                { label: 'Completed', value: completedCount, color: 'text-cyan-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Main Panel */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

              {/* Search */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="relative max-w-sm">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search patient or issue..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                </div>
              </div>

              {/* Date filters */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Filter by Date</p>
                <div className="flex gap-1.5 overflow-x-auto">
                  {dateFilterTabs.map(tab => (
                    <button key={tab.key} onClick={() => setDateFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        dateFilter === tab.key
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status filters */}
              <div className="px-5 py-3 border-b border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Filter by Status</p>
                <div className="flex gap-1.5 overflow-x-auto">
                  {statusFilterTabs.map(tab => (
                    <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        statusFilter === tab.key
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table header — desktop only */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Patient</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Date</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Time</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Type</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Actions</span>
              </div>

              {/* Rows */}
              {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-300">Loading…</div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <p className="text-sm">No appointments found</p>
                  {(statusFilter !== 'all' || dateFilter !== 'all' || search) && (
                    <button onClick={() => { setStatusFilter('all'); setDateFilter('all'); setSearch('') }}
                      className="mt-3 text-xs text-cyan-500 font-semibold hover:underline">
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  {sortedDates.map(dateKey => (
                    <div key={dateKey}>
                      {/* Date group header */}
                      <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-y border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{dayLabel(dateKey)}</span>
                        {dateKey !== 'no-date' && (
                          <span className="text-xs text-gray-400">
                            — {new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        )}
                        <span className="ml-auto text-[11px] bg-gray-200 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                          {groups[dateKey].length} appt{groups[dateKey].length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-50">
                        {groups[dateKey]
                          .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''))
                          .map(appt => (
                            <div key={appt.id}
                              className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_2fr] md:items-center gap-3 md:gap-4 py-3.5 px-5 hover:bg-gray-50 transition-colors">

                              {/* Patient */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
                                  {appt.patient_name?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{appt.patient_name || 'Walk-in'}</p>
                                    {appt.source === 'walkin' && (
                                      <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full shrink-0">Walk-in</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">
                                    {appt.source === 'walkin'
                                      ? `Age ${appt.walkin_age} · ${appt.walkin_phone}`
                                      : appt.issue || 'General consultation'}
                                  </p>
                                </div>
                              </div>

                              {/* Date */}
                              <p className="text-xs font-medium text-gray-700">
                                {appt.appointment_date
                                  ? new Date(appt.appointment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                  : '—'}
                              </p>

                              {/* Time */}
                              <p className="text-sm font-bold text-gray-700">{appt.appointment_time || '—'}</p>

                              {/* Type */}
                              <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg w-fit ${appt.source === 'walkin' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                {appt.source === 'walkin' ? 'Walk-in' : 'Booked'}
                              </span>

                              {/* Status */}
                              <div>
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusStyles[appt.status] || 'bg-gray-100 text-gray-500'}`}>
                                  {appt.status === 'confirmed' ? 'Accepted' : appt.status}
                                </span>
                                {appt.status === 'cancelled' && appt.cancellation_reason && (
                                  <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[100px]">{appt.cancellation_reason}</p>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button onClick={() => setDetailTarget(appt)}
                                  className="px-2.5 py-1.5 border border-gray-200 text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                                  Details
                                </button>

                                {appt.status === 'pending' && (
                                  <>
                                    <button onClick={() => handleConfirm(appt.id)} disabled={acting === appt.id}
                                      className="px-2.5 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors">
                                      {acting === appt.id ? '…' : 'Accept'}
                                    </button>
                                    <button onClick={() => handleReject(appt.id)} disabled={acting === appt.id}
                                      className="px-2.5 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                                      {acting === appt.id ? '…' : 'Reject'}
                                    </button>
                                  </>
                                )}

                                {appt.status === 'confirmed' && (
                                  <>
                                    <button onClick={() => setPrescribeTarget(appt)}
                                      className="px-2.5 py-1.5 border border-cyan-200 text-cyan-600 text-xs font-semibold rounded-lg hover:bg-cyan-50 transition-colors">
                                      Prescribe
                                    </button>

                                    {/* ✅ NEW: video appointments get their own join flow
                                        instead of the in-clinic "Start" button, which
                                        routes to the queue. Everything else is untouched. */}
                                    {appt.consultation_type === 'video' ? (
                                      isVideoJoinable(appt, now) ? (
                                        <button
                                          onClick={() => navigate('/video-call', { state: { appointment: appt } })}
                                          className="px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-colors">
                                          Join Video Consultation
                                        </button>
                                      ) : (
                                        <button disabled
                                          title="Opens 5 minutes before the scheduled time"
                                          className="px-2.5 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg cursor-not-allowed">
                                          Video Not Started
                                        </button>
                                      )
                                    ) : (
                                      <button onClick={() => navigate('/doctor-live-queue')}
                                        className="px-2.5 py-1.5 bg-cyan-500 text-white text-xs font-semibold rounded-lg hover:bg-cyan-600 transition-colors">
                                        Start
                                      </button>
                                    )}

                                    <button onClick={() => setCancelTarget(appt)} disabled={acting === appt.id}
                                      className="px-2.5 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                                      Cancel
                                    </button>
                                  </>
                                )}

                                {appt.status === 'completed' && (
                                  <button onClick={() => setPrescribeTarget(appt)}
                                    className="px-2.5 py-1.5 border border-cyan-200 text-cyan-600 text-xs font-semibold rounded-lg hover:bg-cyan-50 transition-colors">
                                    Prescribe
                                  </button>
                                )}
                              </div>

                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorAppointments