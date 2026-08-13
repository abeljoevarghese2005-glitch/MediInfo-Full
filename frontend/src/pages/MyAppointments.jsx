import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

// Returns true if this video appointment can be joined right now:
// window opens 5 minutes before appointment_time and stays open until
// appointment_time + duration_minutes (defaults to 15 if not set).
function isVideoJoinable(appt, now) {
  if (appt.consultation_type !== 'video') return false
  const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`)
  if (isNaN(apptDateTime.getTime())) return false
  const joinWindowStart = new Date(apptDateTime.getTime() - 5 * 60000)
  const callEnd = new Date(apptDateTime.getTime() + (appt.duration_minutes || 15) * 60000)
  return now >= joinWindowStart && now <= callEnd
}

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
const { t } = useTranslation()
  const today = new Date().toLocaleDateString('en-CA')
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

      const rawSlots = generateSlots(
        avail.start_time.slice(0, 5),
        avail.end_time.slice(0, 5),
        avail.slot_duration || 15
      )

      if (date === today) {
        const now = new Date()
        const bufferMs = 0
        setAvailableSlots(rawSlots.map(slot => {
          const [h, m] = slot.split(':').map(Number)
          const slotTime = new Date()
          slotTime.setHours(h, m, 0, 0)
          return { time: slot, past: slotTime.getTime() <= now.getTime() + bufferMs }
        }))
      } else {
        setAvailableSlots(rawSlots.map(slot => ({ time: slot, past: false })))
      }

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
      addToast(t('myAppointments.toast.rescheduled', { date: formatDate(newDate), time: newTime }), 'info')
      onSuccess()
      onClose()
    } catch (err) {
      addToast(t('myAppointments.toast.rescheduleFailed'), 'cancelled')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold tracking-tight text-gray-800 text-lg">{t('myAppointments.modal.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-sm text-amber-700">
          ⚠️ {t('myAppointments.modal.warningText')}
        </div>

        <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 mb-4">
          <div className={`w-10 h-10 ${getColor(appointment.doctor_name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
            {getInitials(appointment.doctor_name)}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm tracking-tight">{appointment.doctor_name}</p>
            <p className="text-emerald-600 text-xs font-medium">{appointment.specialization || t('doctors.specializations.generalPhysician')}</p>
            <p className="text-gray-400 text-xs">{t('myAppointments.modal.currentlyLabel')} {formatDate(appointment.appointment_date)} {t('liveQueue.at')} {appointment.appointment_time}</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t('myAppointments.modal.newDateLabel')}</label>
          <input type="date" min={today} value={newDate}
            onChange={e => setNewDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-gray-500 mb-2 block">{t('myAppointments.modal.newTimeLabel')}</label>
          {!newDate ? (
            <p className="text-gray-400 text-xs">{t('doctors.selectDateFirst')}</p>
          ) : slotsLoading ? (
            <p className="text-gray-400 text-xs">{t('doctors.loadingSlots')}</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-red-400 text-xs">{t('doctors.noAvailability')}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableSlots.map(({ time, past }) => {
                const isBooked = bookedSlots.includes(time)
                const isSelected = newTime === time
                const isDisabled = isBooked || past
                return (
                  <button key={time} disabled={isDisabled}
                    onClick={() => !isDisabled && setNewTime(time)}
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      isDisabled ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                      : isSelected ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`}>
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button onClick={handleReschedule} disabled={saving || !newDate || !newTime}
          className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold tracking-tight transition-colors hover:bg-emerald-500 disabled:opacity-60">
          {saving ? t('myAppointments.modal.rescheduling') : t('myAppointments.modal.confirmReschedule')}
        </button>
      </div>
    </div>
  )
}

function MyAppointments() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [toasts, setToasts] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)
  const [now, setNow] = useState(new Date())
  const prevAppointments = useRef([])
  const toastCounter = useRef(0)

  const addToast = (message, type = 'info') => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  // Ticks every 30s so the "Join Video Consultation" button can
  // appear/disappear as the join window opens/closes, without a page refresh.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, doctor_id, patient_id, appointment_date, appointment_time,
        status, issue, created_at, cancellation_reason, consultation_type, duration_minutes,
        users!appointments_doctor_id_fkey(full_name)
      `)
      .eq('patient_id', user.id)
      .order('appointment_date', { ascending: false })

    if (error || !data) { setLoading(false); return }

    const doctorIds = [...new Set(data.map(a => a.doctor_id).filter(Boolean))]
    let specializationById = {}
    if (doctorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .in('user_id', doctorIds)
      specializationById = Object.fromEntries(
        (profiles || []).map(p => [p.user_id, p.specialization])
      )
    }

    const normalized = data.map(a => ({
      ...a,
      doctor_name: a.users?.full_name,
      specialization: specializationById[a.doctor_id],
    })) 

    if (prevAppointments.current.length > 0) {
      normalized.forEach(newAppt => {
        const old = prevAppointments.current.find(a => a.id === newAppt.id)
        if (!old || old.status === newAppt.status) return
        const doc = newAppt.doctor_name || t('myAppointments.toast.defaultDoctor')
        if (newAppt.status === 'confirmed')
          addToast(t('myAppointments.toast.confirmed', { doctor: doc }), 'confirmed')
        else if (newAppt.status === 'cancelled')
          addToast(t('myAppointments.toast.cancelledByClinic', { doctor: doc }), 'cancelled')
      })
    }

    prevAppointments.current = normalized
    setAppointments(normalized)
    setLastUpdated(new Date())
    setLoading(false)

    const now = new Date()
    const toExpire = normalized.filter(a => {
      if (a.status !== 'pending') return false
      const apptDateTime = new Date(`${a.appointment_date}T${a.appointment_time}`)
      return apptDateTime < now
    })

    if (toExpire.length > 0) {
      const ids = toExpire.map(a => a.id)
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'expired' })
        .in('id', ids)

      if (!error) {
        setAppointments(prev =>
          prev.map(a => ids.includes(a.id) ? { ...a, status: 'expired' } : a)
        )
      }
    }
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

  const handleJoinVideoCall = (appt) => {
    navigate('/video-call', { state: { appointment: appt } })
  }

  const today = new Date().toLocaleDateString('en-CA')

  const upcoming = appointments.filter(a =>
    a.status !== 'cancelled' &&
    a.status !== 'completed' &&
    a.status !== 'expired' &&
    a.appointment_date >= today
  )
  const past = appointments
  .filter(a =>
    a.status === 'cancelled' ||
    a.status === 'completed' ||
    a.status === 'expired' ||
    a.appointment_date < today
  )
  .sort((a, b) => {
    const dateA = `${a.appointment_date} ${a.appointment_time}`
    const dateB = `${b.appointment_date} ${b.appointment_time}`
    return dateB.localeCompare(dateA)
  })

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed':
      case 'accepted':
        return 'bg-green-100 text-green-700'
      case 'cancelled':
        return 'bg-red-100 text-red-600'
      case 'completed':
        return 'bg-gray-100 text-gray-500'
      case 'expired':
        return 'bg-gray-100 text-gray-400'
      default:
        return 'bg-amber-100 text-amber-700'
    }
  }

  const getStatusLabel = (status) => {
    const key = status === 'accepted' ? 'confirmed' : status
    return t(`myAppointments.status.${key}`, key)
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex overflow-x-hidden">
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

          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-3xl mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">{t('myAppointments.title')}</h1>
                <p className="text-cyan-100 text-sm mt-1">{t('myAppointments.subtitle')}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-cyan-100">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  {t('myAppointments.live')}
                  {lastUpdated && (
                    <span className="hidden sm:inline">
                      · {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button onClick={() => navigate('/doctors')}
                  className="bg-white text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-green-50 hover:text-emerald-600">
                  {t('myAppointments.bookNew')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 sm:px-8 py-6 max-w-5xl w-full">

            {loading ? (
              <div className="text-gray-400 text-sm">{t('common.loading')}</div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold tracking-tight mb-1">{t('myAppointments.emptyTitle')}</p>
                <p className="text-gray-400 text-sm mb-5">{t('myAppointments.emptySubtitle')}</p>
                <button onClick={() => navigate('/doctors')}
                  className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-colors hover:bg-emerald-500">
                  {t('myAppointments.findDoctor')}
                </button>
              </div>
            ) : (
              <div className="space-y-6 max-w-2xl">
                {upcoming.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">{t('myAppointments.upcoming')}</p>
                    <div className="space-y-3">
                      {upcoming.map(appt => {
                        const showJoinVideo = (appt.status === 'confirmed' || appt.status === 'accepted') && isVideoJoinable(appt, now)

                        // TEMP DEBUG — remove once the join-window bug is confirmed/fixed.
                        // Logs the exact raw values for any 'video' appointment so we can see
                        // whether it's a data issue (consultation_type/format) or a timezone issue.
                        if (appt.consultation_type === 'video') {
                          console.log('[VideoDebug]', appt.id, {
                            consultation_type: appt.consultation_type,
                            status: appt.status,
                            appointment_date: appt.appointment_date,
                            appointment_time_raw: appt.appointment_time,
                            duration_minutes: appt.duration_minutes,
                            combinedString: `${appt.appointment_date}T${appt.appointment_time}`,
                            parsedApptDateTime: new Date(`${appt.appointment_date}T${appt.appointment_time}`).toString(),
                            nowLocal: now.toString(),
                            showJoinVideo,
                          })
                        }

                        return (
                        <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                                {getInitials(appt.doctor_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate tracking-tight">{appt.doctor_name}</p>
                                <p className="text-emerald-600 text-xs font-medium">{appt.specialization || t('doctors.specializations.generalPhysician')}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                                  <span>📅 {formatDate(appt.appointment_date)}</span>
                                  <span>🕐 {appt.appointment_time}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize shrink-0 ml-2 ${getStatusStyle(appt.status)}`}>
                              {getStatusLabel(appt.status)}
                            </span>
                          </div>

                          {showJoinVideo && (
                            <button onClick={() => handleJoinVideoCall(appt)}
                              className="w-full mb-2 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold tracking-tight transition-colors hover:bg-emerald-500 flex items-center justify-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Join Video Consultation
                            </button>
                          )}

                          {(appt.status === 'confirmed' || appt.status === 'accepted') ? (
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => navigate('/live-queue', { state: { appointment: appt } })}
                                className="flex-1 min-w-[120px] bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold tracking-tight transition-colors hover:bg-emerald-500 flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                {t('myAppointments.joinLiveQueue')}
                              </button>
                              <button onClick={() => setRescheduling(appt)}
                                className="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-medium transition-colors hover:bg-emerald-50 hover:border-emerald-300">
                                {t('myAppointments.reschedule')}
                              </button>
                              <button onClick={() => handleCancel(appt.id)} disabled={cancelling === appt.id}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                                {cancelling === appt.id ? '...' : t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2 items-center">
                              <div className="flex-1 min-w-[120px] flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-600 py-2.5 px-4 rounded-xl text-sm font-medium">
                                ⏳ {t('myAppointments.awaitingApproval')}
                              </div>
                              <button onClick={() => setRescheduling(appt)}
                                className="px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-medium transition-colors hover:bg-emerald-50 hover:border-emerald-300">
                                {t('myAppointments.reschedule')}
                              </button>
                              <button onClick={() => handleCancel(appt.id)} disabled={cancelling === appt.id}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                                {cancelling === appt.id ? '...' : t('common.cancel')}
                              </button>
                            </div>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">{t('myAppointments.pastAndCancelled')}</p>
                    <div className="space-y-3">
                      {past.map(appt => (
                        <div key={appt.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 opacity-60">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                                {getInitials(appt.doctor_name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate tracking-tight">{appt.doctor_name}</p>
                                <p className="text-emerald-600 text-xs font-medium">{appt.specialization || t('doctors.specializations.generalPhysician')}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                                  <span>📅 {formatDate(appt.appointment_date)}</span>
                                  <span>🕐 {appt.appointment_time}</span>
                                </div>
                              </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize shrink-0 ml-2 ${getStatusStyle(appt.status)}`}>
                              {getStatusLabel(appt.status)}
                            </span>
                          </div>
                          {appt.status === 'cancelled' && (
                            <p className="text-xs text-red-500 mt-2 ml-14">
                              {appt.cancellation_reason
                                ? `Cancelled by doctor: ${appt.cancellation_reason}`
                                : 'Appointment cancelled.'}
                            </p>
                          )}
                          {(appt.status === 'confirmed' || appt.status === 'accepted') && (
                            <p className="text-xs text-green-600 mt-2 ml-14">Appointment confirmed successfully!</p>
                          )}
                          {appt.status === 'completed' && (
                            <p className="text-xs text-gray-500 mt-2 ml-14">Appointment completed. Get well soon!</p>
                          )}
                          {appt.status === 'expired' && (
                            <p className="text-xs text-gray-400 mt-2 ml-14">{t('myAppointments.requestExpiredMessage')}</p>
                          )}
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