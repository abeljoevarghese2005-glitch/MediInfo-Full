import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
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

  const todayIST = new Date().toLocaleDateString('en-CA')

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

  const generateTodaySlots = () => {
    const slots = []
    const now = new Date()
    let h = now.getHours()
    let m = Math.ceil(now.getMinutes() / 15) * 15
    if (m === 60) { h += 1; m = 0 }
    const endH = 21
    while (h < endH || (h === endH && m === 0)) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      m += 15
      if (m === 60) { h += 1; m = 0 }
    }
    return slots
  }

  const slots = generateTodaySlots()

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
            {slots.length === 0 ? (
              <p className="text-xs text-red-400">No slots available for today</p>
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

// ✅ NEW: Prescription Modal
function PrescriptionModal({ appointment, onClose, onSaved }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' }
  ])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [existingPrescription, setExistingPrescription] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'Every 6 hours', 'As needed']
  const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month']

  useEffect(() => {
    fetchExisting()
  }, [])

  const fetchExisting = async () => {
    setLoadingExisting(true)
    const { data } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', appointment.id)
      .single()
    if (data) {
      setExistingPrescription(data)
      setMedicines(data.medicines.length > 0 ? data.medicines : [{ name: '', dosage: '', frequency: '', duration: '' }])
      setNotes(data.notes || '')
    }
    setLoadingExisting(false)
  }

  const addMedicine = () => {
    setMedicines(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }])
  }

  const removeMedicine = (idx) => {
    setMedicines(prev => prev.filter((_, i) => i !== idx))
  }

  const updateMedicine = (idx, field, value) => {
    setMedicines(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  const handleSave = async () => {
    const validMeds = medicines.filter(m => m.name.trim())
    if (validMeds.length === 0) { setError('Add at least one medicine'); return }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        appointment_id: appointment.id,
        doctor_id: user.id,
        patient_id: appointment.patient_id || null,
        walkin_name: appointment.source === 'walkin' ? appointment.walkin_name : null,
        medicines: validMeds,
        notes: notes.trim() || null,
      }
      if (existingPrescription) {
        const { error: updateError } = await supabase
          .from('prescriptions')
          .update({ medicines: validMeds, notes: notes.trim() || null })
          .eq('id', existingPrescription.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('prescriptions')
          .insert(payload)
        if (insertError) throw insertError
      }
      onSaved(`Prescription saved for ${appointment.patient_name}`)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save prescription')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900">
              {existingPrescription ? 'Edit Prescription' : 'Write Prescription'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointment.patient_name} · {appointment.appointment_date} · {appointment.appointment_time}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {loadingExisting ? (
          <div className="py-8 text-center text-gray-300 text-sm">Loading…</div>
        ) : (
          <>
            <div className="space-y-3">
              {medicines.map((med, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Medicine {idx + 1}</p>
                    {medicines.length > 1 && (
                      <button onClick={() => removeMedicine(idx)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={med.name}
                    onChange={e => updateMedicine(idx, 'name', e.target.value)}
                    placeholder="Medicine name *"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white"
                  />
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                    placeholder="Dosage (e.g. 500mg, 1 tablet)"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={med.frequency} onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white text-gray-700">
                      <option value="">Frequency</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={med.duration} onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white text-gray-700">
                      <option value="">Duration</option>
                      {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addMedicine}
              className="w-full py-2 border-2 border-dashed border-cyan-200 text-cyan-500 text-sm font-semibold rounded-xl hover:bg-cyan-50 transition-colors">
              + Add Another Medicine
            </button>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Additional Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Take after meals, avoid dairy products…" rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none" />
            </div>

            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs">❌ {error}</div>}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={submitting}
                className="flex-1 py-2.5 bg-cyan-500 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition-colors">
                {submitting ? 'Saving…' : existingPrescription ? 'Update Prescription' : 'Save Prescription'}
              </button>
            </div>
          </>
        )}
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
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [prescribeTarget, setPrescribeTarget] = useState(null) // ✅ NEW
  const prevAppointments = useRef([])
  const toastCounter = useRef(0)

  const addToast = (message, type = 'info') => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }

  const fetchAppointments = async () => {
    const todayIST = new Date().toLocaleDateString('en-CA')
    const limit = new Date()
    limit.setDate(limit.getDate() + 30)
    const limitIST = limit.toLocaleDateString('en-CA')

    const { data, error } = await supabase
      .from('appointments')
      .select('*, users!appointments_patient_id_fkey(full_name, fcm_token)')
      .eq('doctor_id', user.id)
      .gte('appointment_date', todayIST)
      .lte('appointment_date', limitIST)
      .order('appointment_date', { ascending: true })

    if (error || !data) { setLoading(false); return }

    const normalized = data.map(a => ({
      ...a,
      patient_name: a.source === 'walkin' ? a.walkin_name : a.users?.full_name,
      patient_fcm_token: a.users?.fcm_token,
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
      const appt = appointments.find(a => a.id === id)
      if (appt?.patient_fcm_token) {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            token: appt.patient_fcm_token,
            title: 'Appointment Cancelled',
            body: `Your appointment on ${appt.appointment_date} at ${appt.appointment_time} was cancelled. Reason: ${reason}`,
            data: { type: 'appointment_cancelled', appointment_id: String(id) },
          }),
        })
      }
      addToast(`Appointment cancelled. Patient notified.`)
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

  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length

  const displayed = appointments.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter
    const matchSearch = !search ||
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      (a.issue || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const todayStr = new Date().toLocaleDateString('en-CA')
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA')

  const dayLabel = (dateStr) => {
    if (dateStr === todayStr) return 'Today'
    if (dateStr === tomorrowStr) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  const groups = displayed.reduce((acc, appt) => {
    const key = appt.appointment_date
    if (!acc[key]) acc[key] = []
    acc[key].push(appt)
    return acc
  }, {})
  const sortedDates = Object.keys(groups).sort()

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

        {/* ✅ NEW: Prescription modal */}
        {prescribeTarget && (
          <PrescriptionModal
            appointment={prescribeTarget}
            onClose={() => setPrescribeTarget(null)}
            onSaved={(msg) => { addToast(msg) }}
          />
        )}

        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-5">

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

            <div className="grid grid-cols-3 gap-4 max-w-sm">
              {[
                { label: 'Total', value: appointments.length, color: 'text-gray-800' },
                { label: 'Accepted', value: confirmedCount, color: 'text-green-500' },
                { label: 'Pending', value: pendingCount, color: 'text-amber-500' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="relative max-w-sm">
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search patient or issue..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                </div>
              </div>

              <div className="flex gap-1 px-5 py-3 border-b border-gray-100 overflow-x-auto">
                {[
                  { key: 'all', label: `All (${appointments.length})` },
                  { key: 'pending', label: `Pending (${pendingCount})` },
                  { key: 'confirmed', label: `Accepted (${confirmedCount})` },
                  { key: 'cancelled', label: `Rejected (${appointments.filter(a => a.status === 'cancelled').length})` },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      filter === tab.key ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-300">Loading…</div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <p className="text-sm">No appointments found</p>
                </div>
              ) : (
                <div>
                  {sortedDates.map(dateKey => (
                    <div key={dateKey}>
                      <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-y border-gray-100">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{dayLabel(dateKey)}</span>
                        <span className="text-xs text-gray-400">— {new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        <span className="ml-auto text-[11px] bg-gray-200 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                          {groups[dateKey].length} appt{groups[dateKey].length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {groups[dateKey]
                          .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                          .map(appt => (
                            <div key={appt.id} className="flex items-center gap-4 py-3.5 px-5 hover:bg-gray-50 transition-colors">
                              <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
                                {appt.patient_name?.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{appt.patient_name}</p>
                                  {appt.source === 'walkin' && (
                                    <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full shrink-0">
                                      Walk-in
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 truncate">
                                  {appt.source === 'walkin'
                                    ? `Age ${appt.walkin_age} · ${appt.walkin_phone}`
                                    : appt.issue || 'General consultation'}
                                </p>
                                {appt.status === 'cancelled' && appt.cancellation_reason && (
                                  <p className="text-xs text-red-400 truncate mt-0.5">Reason: {appt.cancellation_reason}</p>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-gray-700">{appt.appointment_time}</p>
                              </div>

                              {appt.status === 'pending' && (
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={() => handleConfirm(appt.id)} disabled={acting === appt.id}
                                    className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50">
                                    {acting === appt.id ? '…' : 'Accept'}
                                  </button>
                                  <button onClick={() => handleReject(appt.id)} disabled={acting === appt.id}
                                    className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50">
                                    {acting === appt.id ? '…' : 'Reject'}
                                  </button>
                                </div>
                              )}

                              {appt.status === 'confirmed' && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusStyles.confirmed}`}>
                                    Accepted
                                  </span>
                                  {/* ✅ NEW: Prescribe button */}
                                  <button onClick={() => setPrescribeTarget(appt)}
                                    className="px-3 py-1.5 border border-cyan-200 text-cyan-600 text-xs font-semibold rounded-lg hover:bg-cyan-50 transition-colors">
                                    Prescribe
                                  </button>
                                  <button onClick={() => setCancelTarget(appt)} disabled={acting === appt.id}
                                    className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                                    Cancel
                                  </button>
                                </div>
                              )}

                              {appt.status === 'completed' && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${statusStyles.completed}`}>
                                    completed
                                  </span>
                                  {/* ✅ Prescribe also available on completed appointments */}
                                  <button onClick={() => setPrescribeTarget(appt)}
                                    className="px-3 py-1.5 border border-cyan-200 text-cyan-600 text-xs font-semibold rounded-lg hover:bg-cyan-50 transition-colors">
                                    Prescribe
                                  </button>
                                </div>
                              )}

                              {appt.status === 'cancelled' && (
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize shrink-0 ${statusStyles.cancelled}`}>
                                  cancelled
                                </span>
                              )}
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