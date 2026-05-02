import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { getDoctorAppointments, confirmAppointment, rejectAppointment } from '../api/index'

const POLL_INTERVAL = 15000

function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-xs bg-cyan-600 text-white">
          <span className="text-base leading-none mt-0.5">🔔</span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-70 hover:opacity-100 leading-none mt-0.5">✕</button>
        </div>
      ))}
    </div>
  )
}

function DoctorAppointments() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [toasts, setToasts] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const prevAppointments = useRef([])
  const intervalRef = useRef(null)
  const toastCounter = useRef(0)

  const addToast = (message) => {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }

  const detectChanges = (fresh) => {
    if (prevAppointments.current.length === 0) return
    const prevIds = new Set(prevAppointments.current.map(a => a.id))
    const newRequests = fresh.filter(a => !prevIds.has(a.id) && a.status === 'pending')
    if (newRequests.length === 1)
      addToast(`New appointment request from ${newRequests[0].patient_name}`)
    else if (newRequests.length > 1)
      addToast(`${newRequests.length} new appointment requests received`)
  }

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchAppointments(false)
    intervalRef.current = setInterval(() => fetchAppointments(true), POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [])

  const fetchAppointments = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await getDoctorAppointments(user.id)
      const now = new Date()
      const limit = new Date()
      limit.setDate(now.getDate() + 30)
      const filtered = res.data.filter(a => {
        const d = new Date(a.appointment_date)
        return d >= now && d <= limit
      })
      detectChanges(filtered)
      prevAppointments.current = filtered
      setAppointments(filtered)
      setLastUpdated(new Date())
    } catch { setAppointments([]) }
    if (!silent) setLoading(false)
  }

  const handleConfirm = async (id) => {
    setActing(id)
    try {
      await confirmAppointment(id)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'confirmed' } : a))
    } catch {}
    setActing(null)
  }

  const handleReject = async (id) => {
    setActing(id)
    try {
      await rejectAppointment(id)
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    } catch {}
    setActing(null)
  }

  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })

  const statusStyles = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
  }

  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length

  const displayed = appointments.filter(a => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'pending' && a.status === 'pending') ||
      (filter === 'confirmed' && a.status === 'confirmed') ||
      (filter === 'cancelled' && a.status === 'cancelled')
    const matchSearch =
      !search ||
      a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
      (a.issue || '').toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <Toast toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
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
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Live
                  {lastUpdated && (
                    <span className="hidden sm:inline">
                      · {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <button onClick={() => fetchAppointments(false)}
                  className="text-sm border border-gray-200 bg-white text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  Refresh
                </button>
              </div>
            </div>

            {/* Mini stats */}
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

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {/* Search */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="relative max-w-sm">
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search patient or issue..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  />
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 px-5 py-3 border-b border-gray-100 overflow-x-auto">
                {[
                  { key: 'all', label: `All (${appointments.length})` },
                  { key: 'pending', label: `Pending (${pendingCount})` },
                  { key: 'confirmed', label: `Accepted (${confirmedCount})` },
                  { key: 'cancelled', label: `Rejected (${appointments.filter(a => a.status === 'cancelled').length})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      filter === tab.key ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* List */}
              {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-300">
                  <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </div>
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">No appointments found</p>
                </div>
              ) : (() => {
                  // Group appointments by date
                  const groups = displayed.reduce((acc, appt) => {
                    const key = appt.appointment_date
                    if (!acc[key]) acc[key] = []
                    acc[key].push(appt)
                    return acc
                  }, {})
                  const sortedDates = Object.keys(groups).sort()
                  const todayStr = new Date().toISOString().split('T')[0]
                  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  const dayLabel = (dateStr) => {
                    if (dateStr === todayStr) return 'Today'
                    if (dateStr === tomorrowStr) return 'Tomorrow'
                    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
                  }
                  return (
                    <div>
                      {sortedDates.map(dateKey => (
                        <div key={dateKey}>
                          {/* Date divider */}
                          <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50 border-y border-gray-100">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                              {dayLabel(dateKey)}
                            </span>
                            <span className="text-xs text-gray-400">
                              — {new Date(dateKey).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span className="ml-auto text-[11px] bg-gray-200 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                              {groups[dateKey].length} appt{groups[dateKey].length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {/* Appointments under this date */}
                          <div className="divide-y divide-gray-50">
                            {groups[dateKey]
                              .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
                              .map(appt => (
                                <div key={appt.id} className="flex items-center gap-4 py-3.5 px-5 hover:bg-gray-50 transition-colors">
                                  <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
                                    {appt.patient_name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{appt.patient_name}</p>
                                    <p className="text-xs text-gray-400 truncate">{appt.issue || 'General consultation'}</p>
                                  </div>
                                  {/* Time — always visible since date is in the group header */}
                                  <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-gray-700">{appt.appointment_time}</p>
                                  </div>
                                  {appt.status === 'pending' ? (
                                    <div className="flex gap-2 shrink-0">
                                      <button
                                        onClick={() => handleConfirm(appt.id)}
                                        disabled={acting === appt.id}
                                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                      >
                                        {acting === appt.id ? '…' : 'Accept'}
                                      </button>
                                      <button
                                        onClick={() => handleReject(appt.id)}
                                        disabled={acting === appt.id}
                                        className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                                      >
                                        {acting === appt.id ? '…' : 'Reject'}
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize shrink-0 ${statusStyles[appt.status] || 'bg-gray-100 text-gray-500'}`}>
                                      {appt.status}
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorAppointments
