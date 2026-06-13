import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

// Parse "HH:MM" time string into total minutes from midnight
function timeToMinutes(timeStr) {
  if (!timeStr) return 0
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

// Add minutes to a "HH:MM" string, returns new "HH:MM" string
function addMinutesToTime(timeStr, mins) {
  const total = timeToMinutes(timeStr) + mins
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Format "HH:MM" → "8:30 AM"
function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

// Travel option string ("20m") → integer minutes
function travelToMinutes(opt, custom) {
  if (custom) return parseInt(custom) || 0
  return parseInt(opt) || 20
}

// Generate stable integer notification ID
function makeNotifId(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function LiveQueue() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [appointment, setAppointment] = useState(
    location.state?.appointment?.status === 'confirmed' ? location.state.appointment : null
  )
  const [loading, setLoading] = useState(
    !location.state?.appointment || location.state?.appointment?.status !== 'confirmed'
  )

  // Real queue data
  const [queuePosition, setQueuePosition] = useState(null)   // patients ahead of me
  const [totalAhead, setTotalAhead] = useState(null)          // same as queuePosition (patients before me)
  const [waitMinutes, setWaitMinutes] = useState(null)        // calculated from duration_minutes
  const [estimatedTurnTime, setEstimatedTurnTime] = useState(null) // "HH:MM" when my turn is

  const [travelTime, setTravelTime] = useState('20m')
  const [customMinutes, setCustomMinutes] = useState('')
  const [notified, setNotified] = useState(false)
  const [notifyError, setNotifyError] = useState('')

  const channelRef = useRef(null)

  useEffect(() => {
    if (!location.state?.appointment) {
      fetchNextAppointment()
    } else {
      // Already have appointment from navigation state, just load queue data
      fetchQueueData(location.state.appointment)
    }

    return () => {
      // Cleanup Realtime subscription on unmount
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  const fetchNextAppointment = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('appointments')
        .select('*, users!appointments_doctor_id_fkey(full_name, specialization, clinic_name)')
        .eq('patient_id', user.id)
        .eq('status', 'confirmed')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true })

      if (!error && data?.length) {
        const appt = {
          ...data[0],
          doctor_name: data[0].users?.full_name,
          specialization: data[0].users?.specialization,
          clinic_name: data[0].users?.clinic_name,
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
      // Fetch all confirmed appointments for the same doctor on the same date,
      // ordered by appointment_time. This gives us the real queue.
      const { data: queueData, error } = await supabase
        .from('appointments')
        .select('id, appointment_time, duration_minutes, status')
        .eq('doctor_id', appt.doctor_id)
        .eq('appointment_date', appt.appointment_date)
        .in('status', ['confirmed', 'in_progress'])
        .order('appointment_time', { ascending: true })

      if (error || !queueData) return

      // Find my position in the queue
      const myIndex = queueData.findIndex(q => q.id === appt.id)
      if (myIndex === -1) return

      const patientsAhead = myIndex // 0-indexed = number of people before me
      setQueuePosition(patientsAhead)
      setTotalAhead(patientsAhead)

      // Calculate total wait time = sum of duration_minutes for all appointments before mine
      const totalWait = queueData
        .slice(0, myIndex)
        .reduce((sum, q) => sum + (q.duration_minutes || 15), 0)

      setWaitMinutes(totalWait)

      // Estimate what time it'll be my turn
      if (appt.appointment_time) {
        // My turn starts at my appointment_time (slots are pre-assigned by time)
        // But we also show how long the queue before me will actually take
        const turnTime = addMinutesToTime(
          queueData[0].appointment_time, // queue started from first patient's time
          queueData.slice(0, myIndex).reduce((sum, q) => sum + (q.duration_minutes || 15), 0)
        )
        setEstimatedTurnTime(turnTime)
      }

      // Subscribe to Realtime updates for this doctor's appointments today
      subscribeToQueue(appt)
    } catch (err) {
      console.error('fetchQueueData error:', err)
    }
  }

  const subscribeToQueue = (appt) => {
    // Remove any existing subscription first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`queue_${appt.doctor_id}_${appt.appointment_date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${appt.doctor_id}`,
        },
        () => {
          // Any change to this doctor's appointments → refresh queue data
          fetchQueueData(appt)
        }
      )
      .subscribe()

    channelRef.current = channel
  }

  const handleNotifyWhenToLeave = async () => {
    setNotifyError('')
    if (!estimatedTurnTime) {
      setNotifyError('Queue position not available yet.')
      return
    }

    try {
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display !== 'granted') {
        setNotifyError('Please allow notifications in device settings.')
        return
      }

      const travelMins = travelToMinutes(travelTime, customMinutes)
      const today = appointment.appointment_date

      // Parse estimated turn time into a Date object
      const [turnH, turnM] = estimatedTurnTime.split(':').map(Number)
      const turnDate = new Date()
      turnDate.setFullYear(...today.split('-').map(Number))
      turnDate.setHours(turnH, turnM, 0, 0)

      // Notify at (estimated turn time - travel time)
      const notifyAt = new Date(turnDate.getTime() - travelMins * 60 * 1000)

      if (notifyAt <= new Date()) {
        setNotifyError('Your turn is too soon — leave now!')
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
      setNotifyError('Could not schedule notification. Please try again.')
      console.error(err)
    }
  }

  // Progress bar: 0 patients ahead = 100%, many ahead = lower %
  const maxExpectedQueue = 10
  const progress = queuePosition !== null
    ? Math.round(((maxExpectedQueue - Math.min(queuePosition, maxExpectedQueue)) / maxExpectedQueue) * 100)
    : 0

  if (loading) return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Loading queue...
          </div>
        </div>
      </div>
    </SidebarProvider>
  )

  if (!appointment) return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
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
    </SidebarProvider>
  )

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-6">

              <button
                onClick={() => navigate('/my-appointments')}
                className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-sm font-medium mb-6 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>

              {/* Queue position card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-4 text-center">
                <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest mb-3">
                  You're in the queue
                </p>

                {queuePosition === null ? (
                  <p className="text-gray-400 text-sm py-4">Calculating position...</p>
                ) : queuePosition === 0 ? (
                  <>
                    <div className="text-5xl mb-2">🎉</div>
                    <p className="text-xl font-black text-green-500 mb-1">You're next!</p>
                    <p className="text-gray-400 text-sm mb-4">Head to the clinic now</p>
                  </>
                ) : (
                  <>
                    <div className="text-7xl font-black text-cyan-500 leading-none mb-2">
                      {queuePosition}
                    </div>
                    <p className="text-gray-500 text-sm mb-4">
                      {queuePosition === 1 ? '1 patient' : `${queuePosition} patients`} before you
                    </p>
                    <p className="text-xl font-black text-gray-900 mb-1">
                      ~{waitMinutes} min wait
                    </p>
                    {estimatedTurnTime && (
                      <p className="text-cyan-500 text-sm font-semibold mb-1">
                        Your turn around {formatTime(estimatedTurnTime)}
                      </p>
                    )}
                    <p className="text-gray-400 text-xs mb-5">based on actual appointment durations</p>
                  </>
                )}

                <div className="flex items-center justify-center gap-1.5 mb-6">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-500 text-xs font-semibold">Live — updates automatically</span>
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

              {/* Relax banner */}
              {queuePosition !== null && queuePosition > 2 && (
                <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 mb-4">
                  <p className="font-bold text-gray-800 text-sm mb-0.5">Relax, you still have time</p>
                  <p className="text-gray-500 text-xs">Set your travel time below and we'll tell you exactly when to leave.</p>
                </div>
              )}

              {queuePosition === 0 && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-2xl px-5 py-4 mb-4">
                  <p className="font-bold text-cyan-700 text-sm mb-0.5">🏃 Head to the clinic now!</p>
                  <p className="text-cyan-500 text-xs">You're next in line — don't keep the doctor waiting.</p>
                </div>
              )}

              {/* Travel time + notify */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <p className="font-bold text-gray-800 text-sm">Set your travel time</p>
                </div>
                <p className="text-gray-400 text-xs mb-3 ml-6">We'll notify you at the right time to leave.</p>
                <div className="flex gap-2 mb-3">
                  {TRAVEL_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => { setTravelTime(opt); setCustomMinutes(''); setNotified(false); setNotifyError('') }}
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
                  onChange={e => { setCustomMinutes(e.target.value); setTravelTime(''); setNotified(false); setNotifyError('') }}
                  placeholder="Or enter custom minutes"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder-gray-300"
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
                className={`w-full py-4 rounded-2xl font-bold text-sm mb-2 transition-all ${
                  notified
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-white hover:from-cyan-600 hover:to-cyan-500 shadow-md'
                }`}
              >
                {notified ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    You'll be notified when to leave!
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
                {notified && estimatedTurnTime
                  ? `Notification set for ${travelToMinutes(travelTime, customMinutes)} min before your estimated turn at ${formatTime(estimatedTurnTime)}`
                  : "We'll notify you before your turn — no need to keep checking."
                }
              </p>

              {/* Doctor info */}
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
                      📅 {appointment.appointment_date} &nbsp;🕐 {formatTime(appointment.appointment_time)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/doctors')}
                  className="py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
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
    </SidebarProvider>
  )
}

export default LiveQueue
