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

function MyAppointments() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [toasts, setToasts] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
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

    // Detect status changes for toasts
    if (prevAppointments.current.length > 0) {
      normalized.forEach(newAppt => {
        const old = prevAppointments.current.find(a => a.id === newAppt.id)
        if (!old || old.status === newAppt.status) return
        const doc = newAppt.doctor_name || 'your doctor'
        if (newAppt.status === 'confirmed')
          addToast(`Your appointment with ${doc} has been confirmed! 🎉`, 'confirmed')
        else if (newAppt.status === 'cancelled')
          addToast(`Your appointment with ${doc} was rejected by the clinic.`, 'cancelled')
      })
    }

    prevAppointments.current = normalized
    setAppointments(normalized)
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()

    // Real-time subscription — replaces polling
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `patient_id=eq.${user.id}`,
      }, () => {
        fetchAppointments()
      })
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
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <Toast toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 px-8 py-8">
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
                              <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                                {getInitials(appt.doctor_name)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{appt.doctor_name}</p>
                                <p className="text-cyan-500 text-xs">{appt.specialization || 'General Physician'}</p>
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
                          {appt.status === 'confirmed' ? (
                            <div className="flex gap-2">
                              <button onClick={() => navigate('/live-queue', { state: { appointment: appt } })}
                                className="flex-1 bg-cyan-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600 flex items-center justify-center gap-2">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                Join Live Queue
                              </button>
                              <button onClick={() => handleCancel(appt.id)} disabled={cancelling === appt.id}
                                className="px-4 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 disabled:opacity-50">
                                {cancelling === appt.id ? '...' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <div className="flex-1 flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-600 py-2.5 px-4 rounded-xl text-sm font-medium">
                                ⏳ Awaiting approval
                              </div>
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
                              <div className={`w-11 h-11 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                                {getInitials(appt.doctor_name)}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{appt.doctor_name}</p>
                                <p className="text-cyan-500 text-xs">{appt.specialization || 'General Physician'}</p>
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
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default MyAppointments