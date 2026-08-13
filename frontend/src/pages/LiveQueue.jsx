import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'
import { LocalNotifications } from '@capacitor/local-notifications'

const TRAVEL_OPTIONS = ['10m', '15m', '20m', '30m']

const avatarColors = [
  'bg-cyan-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-blue-500'
]
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'

function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function addMinutesToTime(timeStr, mins) {
  const total = timeToMinutes(timeStr) + mins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

function travelToMinutes(opt, custom) {
  if (custom) return parseInt(custom) || 0
  return parseInt(opt) || 20
}

function makeNotifId(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

// Returns today's date in IST as "YYYY-MM-DD"
function getTodayIST() {
  return new Date().toLocaleDateString('en-CA')
}

// Returns current time in IST as total minutes from midnight
function getNowMinutes() {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

// Given an appointment, returns one of:
//   'future_date'   — appointment is on a future date, don't show queue at all
//   'too_early'     — appointment is today but not yet time to leave
//   'time_to_leave' — now >= appointmentTime - travelMins
//   'next_now'      — queue position is 0 AND it's time to leave
function getQueueState(appointment, queuePosition, travelMins) {
  if (!appointment) return 'no_appointment'

  const today = getTodayIST()
  const apptDate = appointment.appointment_date

  // Appointment is on a future date
  if (apptDate > today) return 'future_date'

  // Appointment is today — check time
  const nowMins = getNowMinutes()
  const apptMins = timeToMinutes(appointment.appointment_time)
  const leaveBy = apptMins - travelMins

  if (queuePosition === 0) {
    // I'm next — should I leave now?
    if (nowMins >= leaveBy) return 'next_now'
    return 'next_wait' // next in queue but not time to leave yet
  }

  // Not next in queue
  if (nowMins >= leaveBy) return 'time_to_leave'
  return 'too_early'
}

// Format a countdown from now until a future "HH:MM" time string today
function getCountdown(targetTimeStr) {
  if (!targetTimeStr) return null
  const nowMins = getNowMinutes()
  const targetMins = timeToMinutes(targetTimeStr)
  const diff = targetMins - nowMins
  if (diff <= 0) return null
  const h = Math.floor(diff / 60)
  const m = diff % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m} min`
}

function LiveQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [appointment, setAppointment] = useState(
    location.state?.appointment?.status === 'confirmed' ? location.state.appointment : null
  )
  const [loading, setLoading] = useState(
    !location.state?.appointment || location.state?.appointment?.status !== 'confirmed'
  )

  const [queuePosition, setQueuePosition] = useState(null)
  const [waitMinutes, setWaitMinutes] = useState(null)
  const [estimatedTurnTime, setEstimatedTurnTime] = useState(null)

  const [travelTime, setTravelTime] = useState('20m')
  const [customMinutes, setCustomMinutes] = useState('')
  const [notified, setNotified] = useState(false)
  const [notifyError, setNotifyError] = useState('')

  // Countdown ticker — re-render every 30s so "leave by" UI stays fresh
  const [, setTick] = useState(0)
  const channelRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!location.state?.appointment) {
      fetchNextAppointment()
    } else {
      fetchQueueData(location.state.appointment)
    }
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  const fetchNextAppointment = async () => {
    setLoading(true)
    try {
      const today = getTodayIST()
      const { data, error } = await supabase
        .from('appointments')
        .select('*, users!appointments_doctor_id_fkey(full_name)')
        .eq('patient_id', user.id)
        .eq('status', 'confirmed')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (!error && data?.length) {
        let doctorProfile = null
        if (data[0].doctor_id) {
          const { data: profile } = await supabase
            .from('doctor_profiles')
            .select('specialization, clinic_name')
            .eq('user_id', data[0].doctor_id)
            .maybeSingle()
          doctorProfile = profile
        }
        const appt = {
          ...data[0],
          doctor_name: data[0].users?.full_name,
          specialization: doctorProfile?.specialization,
          clinic_name: doctorProfile?.clinic_name,
        }
        setAppointment(appt)
        await fetchQueueData(appt)
      } else {
        setAppointment(null)
      }
    } catch {
      setAppointment(null)
    }
    setLoading(false)
  }

  const fetchQueueData = async (appt) => {
    if (!appt) return
    try {
      const { data: queueData, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, duration_minutes, status')
        .eq('doctor_id', appt.doctor_id)
        .eq('appointment_date', appt.appointment_date)
        .in('status', ['confirmed', 'in_progress'])
        .order('appointment_time', { ascending: true })

      if (error || !queueData) return

      const myIndex = queueData.findIndex(q => q.id === appt.id)
      if (myIndex === -1) return

      const patientsAhead = myIndex
      setQueuePosition(patientsAhead)

      const totalWait = queueData
        .slice(0, myIndex)
        .reduce((sum, q) => sum + (q.duration_minutes || 15), 0)
      setWaitMinutes(totalWait)

      if (appt.appointment_time) {
        const turnTime = addMinutesToTime(
          queueData[0].appointment_time,
          queueData.slice(0, myIndex).reduce((sum, q) => sum + (q.duration_minutes || 15), 0)
        )
        setEstimatedTurnTime(turnTime)
      }

      subscribeToQueue(appt)
    } catch (err) {
      console.error('fetchQueueData error:', err)
    }
  }

  const subscribeToQueue = (appt) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`queue_${appt.doctor_id}_${appt.appointment_date}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `doctor_id=eq.${appt.doctor_id}`,
      }, () => fetchQueueData(appt))
      .subscribe()
    channelRef.current = channel
  }

  const handleNotifyWhenToLeave = async () => {
    setNotifyError('')
    if (!estimatedTurnTime) {
      setNotifyError(t('liveQueue.queueNotAvailable'))
      return
    }
    try {
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display !== 'granted') {
        setNotifyError(t('liveQueue.allowNotif'))
        return
      }

      const travelMins = travelToMinutes(travelTime, customMinutes)
      const today = appointment.appointment_date
      const [turnH, turnM] = estimatedTurnTime.split(':').map(Number)
      const turnDate = new Date()
      turnDate.setFullYear(...today.split('-').map(Number))
      turnDate.setHours(turnH, turnM, 0, 0)
      const notifyAt = new Date(turnDate.getTime() - travelMins * 60 * 1000)

      if (notifyAt <= new Date()) {
        setNotifyError(t('liveQueue.tooSoon'))
        setNotified(true)
        return
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: makeNotifId(`leave_${appointment.id}`),
          title: '🚗 Time to Leave!',
          body: `Your appointment with Dr. ${appointment.doctor_name} is in ~${travelMins} min. Leave now!`,
          schedule: { at: notifyAt },
          sound: 'default',
          extra: { appointmentId: appointment.id },
        }]
      })
      setNotified(true)
    } catch (err) {
      setNotifyError(t('liveQueue.notifError'))
      console.error(err)
    }
  }

  const travelMins = travelToMinutes(travelTime, customMinutes)
  const queueState = getQueueState(appointment, queuePosition, travelMins)

  // Derive leaveByTime string for display — apptTime minus travel
  const leaveByTime = appointment?.appointment_time
    ? addMinutesToTime(appointment.appointment_time, -travelMins)
    : null

  const maxExpectedQueue = 10
  const progress = queuePosition !== null
    ? Math.round(((maxExpectedQueue - Math.min(queuePosition, maxExpectedQueue)) / maxExpectedQueue) * 100)
    : 0

  // ── Shared page shell ─────────────────────────────────────────────────────
  const Shell = ({ children }) => (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />
          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-3xl mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Live Queue</h1>
<p className="text-cyan-100 text-sm mt-1">Real-time updates for your appointment</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <Shell>
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-16">
        {t('liveQueue.loading')}
      </div>
    </Shell>
  )

  // ── No appointment ────────────────────────────────────────────────────────
  if (!appointment) return (
    <Shell>
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-700 font-semibold tracking-tight mb-1">{t('liveQueue.noAppointment')}</p>
        <p className="text-gray-400 text-sm mb-5 text-center">{t('liveQueue.noAppointmentSub')}</p>
        <button
          onClick={() => navigate('/doctors')}
          className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-colors hover:bg-emerald-500"
        >
          {t('liveQueue.bookDoctor')}
        </button>
      </div>
    </Shell>
  )

  // ── Future date — appointment is not today ────────────────────────────────
  if (queueState === 'future_date') return (
    <Shell>
      <div className="max-w-xl mx-auto px-6 pb-6">
        <button
          onClick={() => navigate('/my-appointments')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 text-center mb-4">
          <div className="text-5xl mb-4">📅</div>
          <p className="text-lg font-semibold tracking-tight text-gray-800 mb-2">{t('liveQueue.notToday')}</p>
          <p className="text-gray-500 text-sm mb-1">
            {t('liveQueue.scheduledFor')} <span className="font-semibold text-emerald-600">{appointment.appointment_date}</span> {t('liveQueue.at')}{' '}
            <span className="font-semibold text-emerald-600">{formatTime(appointment.appointment_time)}</span>
          </p>
          <p className="text-gray-400 text-xs mt-3">
            {t('liveQueue.comeBack')}
          </p>
        </div>

        {/* Doctor info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 ${getColor(appointment.doctor_name)} rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
              {getInitials(appointment.doctor_name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm tracking-tight">{appointment.doctor_name}</p>
              <p className="text-emerald-600 text-xs font-medium">{appointment.specialization || 'General Physician'}</p>
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
      </div>
    </Shell>
  )

  // ── Main queue UI (appointment is today) ─────────────────────────────────
  return (
    <Shell>
      <div className="max-w-xl mx-auto px-6 pb-6">

        <button
          onClick={() => navigate('/my-appointments')}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('common.back')}
        </button>

        {/* ── Queue position card ── */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4 text-center">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-widest mb-3">
            {t('liveQueue.inQueue')}
          </p>

          {queuePosition === null ? (
            <p className="text-gray-400 text-sm py-4">{t('liveQueue.calculating')}</p>

          ) : queueState === 'next_now' ? (
            // ── Next + time to leave ──
            <>
              <div className="text-5xl mb-2">🎉</div>
              <p className="text-xl font-semibold tracking-tight text-green-600 mb-1">{t('liveQueue.youreNext')}</p>
              <p className="text-gray-400 text-sm mb-4">{t('liveQueue.headToClinic')}</p>
            </>

          ) : queueState === 'next_wait' ? (
            // ── Next in queue but appointment time hasn't come yet ──
            <>
              <div className="text-5xl mb-2">🎉</div>
              <p className="text-xl font-semibold tracking-tight text-emerald-600 mb-1">{t('liveQueue.youreNext')}</p>
              <p className="text-gray-400 text-sm mb-1">
                {t('liveQueue.appointmentAt')}{' '}
                <span className="font-semibold text-emerald-600">{formatTime(appointment.appointment_time)}</span>
              </p>
              {leaveByTime && (
                <p className="text-amber-500 text-sm font-medium mb-1">
                  {t('liveQueue.leaveBy')} {formatTime(leaveByTime)}
                  {getCountdown(leaveByTime) && (
                    <span className="text-gray-400 font-normal"> · {t('liveQueue.in')} {getCountdown(leaveByTime)}</span>
                  )}
                </p>
              )}
              <p className="text-gray-400 text-xs mb-4">{t('liveQueue.notifyToLeave')}</p>
            </>

          ) : (
            // ── Waiting in queue ──
            <>
              <div className="text-7xl font-bold tracking-tight text-emerald-600 leading-none mb-2">
                {queuePosition}
              </div>
              <p className="text-gray-500 text-sm mb-4">
                {t('liveQueue.patientsAhead', { count: queuePosition })}
              </p>
              <p className="text-xl font-semibold tracking-tight text-gray-900 mb-1">
                {t('liveQueue.minWait', { minutes: waitMinutes })}
              </p>
              {estimatedTurnTime && (
                <p className="text-emerald-600 text-sm font-medium mb-1">
                  {t('liveQueue.yourTurn')} {formatTime(estimatedTurnTime)}
                </p>
              )}
              {leaveByTime && (
                <p className="text-amber-500 text-sm font-medium mb-1">
                  {t('liveQueue.leaveBy')} {formatTime(leaveByTime)}
                  {getCountdown(leaveByTime) && (
                    <span className="text-gray-400 font-normal"> · {t('liveQueue.in')} {getCountdown(leaveByTime)}</span>
                  )}
                </p>
              )}
              <p className="text-gray-400 text-xs mb-5">{t('liveQueue.basedOn')}</p>
            </>
          )}

          <div className="flex items-center justify-center gap-1.5 mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-600 text-xs font-medium">{t('liveQueue.liveUpdates')}</span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>{t('liveQueue.checkedIn')}</span>
              <span>{t('liveQueue.yourTurnLabel')}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Contextual banners ── */}
        {queueState === 'next_now' && (
          <div className="bg-green-50 border border-emerald-200 rounded-2xl px-5 py-4 mb-4">
            <p className="font-semibold tracking-tight text-emerald-700 text-sm mb-0.5">🏃 {t('liveQueue.headNow')}</p>
            <p className="text-emerald-600 text-xs">{t('liveQueue.nextInLine')}</p>
          </div>
        )}

        {queueState === 'time_to_leave' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-4">
            <p className="font-semibold tracking-tight text-amber-700 text-sm mb-0.5">🚗 {t('liveQueue.timeToLeave')}</p>
            <p className="text-amber-600 text-xs">
              {t('liveQueue.basedOnTravel', { minutes: travelMins })}
            </p>
          </div>
        )}

        {(queueState === 'too_early' || queueState === 'next_wait') && queuePosition !== null && queuePosition > 0 && (
          <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 mb-4">
            <p className="font-semibold tracking-tight text-gray-800 text-sm mb-0.5">{t('liveQueue.relaxTime')}</p>
            <p className="text-gray-500 text-xs">{t('liveQueue.setTravelBelow')}</p>
          </div>
        )}

        {/* ── Travel time + notify ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <p className="font-semibold tracking-tight text-gray-800 text-sm">{t('liveQueue.setTravelTime')}</p>
          </div>
          <p className="text-gray-400 text-xs mb-3 ml-6">{t('liveQueue.notifyRight')}</p>
          <div className="flex gap-2 mb-3">
            {TRAVEL_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => { setTravelTime(opt); setCustomMinutes(''); setNotified(false); setNotifyError('') }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold tracking-tight transition-all duration-150 ${
                  travelTime === opt && !customMinutes
                    ? 'bg-emerald-600 text-white shadow-sm scale-105 hover:bg-emerald-500'
                    : 'border border-gray-200 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
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
            onChange={e => { setCustomMinutes(e.target.value); setTravelTime(''); setNotified(false); setNotifyError('') }}
            placeholder={t('liveQueue.customMinutes')}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40"
          />
        </div>

        {notifyError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-2.5 rounded-xl mb-3">
            {notifyError}
          </div>
        )}

        <button
          onClick={handleNotifyWhenToLeave}
          disabled={notified}
          className={`w-full py-4 rounded-2xl font-bold tracking-tight text-sm mb-2 transition-all ${
            notified
              ? 'bg-green-600 text-white cursor-default'
              : 'bg-gradient-to-r from-emerald-700 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-500 shadow-md'
          }`}
        >
          {notified ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('liveQueue.notified')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {t('liveQueue.tellMeWhen')}
            </span>
          )}
        </button>
        <p className="text-center text-gray-400 text-xs mb-5">
          {notified && estimatedTurnTime
            ? t('liveQueue.notifySet', { minutes: travelMins, time: formatTime(estimatedTurnTime) })
            : t('liveQueue.noNeedToCheck')
          }
        </p>

        {/* ── Doctor info ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 ${getColor(appointment.doctor_name)} rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
              {getInitials(appointment.doctor_name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm tracking-tight">{appointment.doctor_name}</p>
              <p className="text-emerald-600 text-xs font-medium">{appointment.specialization || 'General Physician'}</p>
              {appointment.clinic_name && (
                <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {appointment.clinic_name}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-0.5">
                📅 {appointment.appointment_date} &nbsp;🕐 {formatTime(appointment.appointment_time)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/doctors')}
            className="py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('liveQueue.reschedule')}
          </button>
          <button
            onClick={() => navigate('/my-appointments')}
            className="py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            {t('liveQueue.cancelAppt')}
          </button>
        </div>

      </div>
    </Shell>
  )
}

export default LiveQueue