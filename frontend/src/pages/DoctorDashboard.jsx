import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import LocationBar from '../components/LocationBar'
import { getDoctorAppointments, confirmAppointment, rejectAppointment, getNearbyPatients } from '../api/index'

// ─── helpers ────────────────────────────────────────────────────────────────
const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

const getWeekDays = () => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const today = new Date()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return { label: days[d.getDay()], date: d.getDate(), isToday: i === 0 }
  })
}

// ─── stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, subColor = 'text-cyan-500' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">{icon}</span>
        <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
        </svg>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        {sub && <p className={`text-xs font-semibold mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

// ─── appointment row ─────────────────────────────────────────────────────────
function AppointmentRow({ appt, onConfirm, onReject, acting }) {
  const statusStyles = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
  }
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
    })

  return (
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
        {appt.patient_name?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{appt.patient_name}</p>
        <p className="text-xs text-gray-400 truncate">{appt.issue || appt.notes || 'General consultation'}</p>
      </div>
      <div className="hidden sm:block text-right shrink-0">
        <p className="text-xs font-medium text-gray-600">{fmt(appt.appointment_date)}</p>
        <p className="text-xs text-gray-400">{appt.appointment_time}</p>
      </div>
      {appt.status === 'pending' ? (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onConfirm(appt.id)}
            disabled={acting === appt.id}
            className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            {acting === appt.id ? '…' : 'Accept'}
          </button>
          <button
            onClick={() => onReject(appt.id)}
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
  )
}

// ─── main ────────────────────────────────────────────────────────────────────
function DoctorDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [nearbyPatients, setNearbyPatients] = useState([])
  const weekDays = getWeekDays()

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchAppointments()
  }, [])

  const handleLocationReady = useCallback((loc) => {
    if (!loc) return
    getNearbyPatients(loc.lat, loc.lng, 25)
      .then(res => setNearbyPatients(res.data))
      .catch(() => {})
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      const res = await getDoctorAppointments(user.id)
      setAppointments(res.data)
    } catch {
      setAppointments([])
    }
    setLoading(false)
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

  const today = new Date().toISOString().split('T')[0]
  const todayCount = appointments.filter(a => a.appointment_date?.startsWith(today)).length
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length
  const rating = user.rating || 4.9

  const filterTabs = [
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'confirmed', label: `Accepted (${confirmedCount})` },
    { key: 'cancelled', label: `Rejected (${appointments.filter(a => a.status === 'cancelled').length})` },
    { key: 'all', label: `All (${appointments.length})` },
  ]
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

        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />

          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0">
                  {user.full_name?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div>
                  <p className="text-sm text-gray-400">{greeting()}</p>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-gray-900">Dr. {user.full_name}</h1>
                    <svg className="w-5 h-5 text-cyan-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm text-gray-500">
                      {user.specialization || 'General Physician'} · {user.experience || 5} yrs experience
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-shadow">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Reports
                </button>
                <button className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-shadow">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI Assistant
                </button>
              </div>
            </div>

            {/* ── Location Bar ────────────────────────────────── */}
            <LocationBar onLocationReady={handleLocationReady} />

            {/* ── Nearby Patients ─────────────────────────────── */}
            {nearbyPatients.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Nearby patients who've booked you
                </h2>
                <p className="text-xs text-gray-400 mb-3">Within 25 km, sorted by distance</p>
                <div className="space-y-2">
                  {nearbyPatients.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2.5 bg-cyan-50 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-cyan-200 text-cyan-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          {p.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.full_name}</p>
                          <p className="text-xs text-gray-400">{p.date} · {p.time}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-cyan-600 bg-white px-2.5 py-1 rounded-lg border border-cyan-100">
                        {p.distance_km.toFixed(1)} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Stats ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                value={todayCount} label="Today's patients" sub="+12%" subColor="text-green-500"
              />
              <StatCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                value={pendingCount} label="Pending requests"
                sub={pendingCount > 0 ? 'Action needed' : 'All clear'}
                subColor={pendingCount > 0 ? 'text-amber-500' : 'text-green-500'}
              />
              <StatCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                value={confirmedCount} label="Accepted" sub="This week" subColor="text-cyan-500"
              />
              <StatCard
                icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                value={rating} label="Rating" sub="232 reviews" subColor="text-gray-400"
              />
            </div>

            {/* ── Main Content + Right Panel ──────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Left — Appointments table */}
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Appointments</h2>
                    <p className="text-xs text-gray-400">Manage requests from patients in real time.</p>
                  </div>
                  <button onClick={fetchAppointments} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    Refresh
                  </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="relative">
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search patient or issue..."
                      className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent" />
                  </div>
                </div>

                <div className="flex gap-1 px-5 py-3 border-b border-gray-100 overflow-x-auto">
                  {filterTabs.map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        filter === tab.key ? 'bg-cyan-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="divide-y divide-gray-50 min-h-[200px]">
                  {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-300">
                      <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading…
                    </div>
                  ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                      <svg className="w-10 h-10 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">No {filter === 'all' ? '' : filter} appointments</p>
                      <p className="text-xs mt-1">When patients book, they'll appear here.</p>
                    </div>
                  ) : (
                    displayed.map(appt => (
                      <AppointmentRow key={appt.id} appt={appt} onConfirm={handleConfirm} onReject={handleReject} acting={acting} />
                    ))
                  )}
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-4">

                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-800">Profile</h3>
                    <button className="text-xs text-cyan-500 font-semibold hover:text-cyan-600">Edit</button>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      {
                        icon: <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
                        text: user.clinic_name || 'Apollo Clinic',
                      },
                      {
                        icon: <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                        text: user.email || 'doctor@example.com',
                      },
                      {
                        icon: <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
                        text: user.phone || '—',
                      },
                      {
                        icon: <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
                        text: `License · ${user.license_number || 'MCI-123456'}`,
                      },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        {row.icon}
                        <span className="text-sm text-gray-600 truncate">{row.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 text-center">
                    <div>
                      <p className="text-base font-bold text-gray-800">{appointments.length}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-green-500">{confirmedCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Accepted</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-amber-500">{pendingCount}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pending</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-800">This week</h3>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((d, i) => (
                      <div key={i} className={`flex flex-col items-center py-2 rounded-xl text-xs ${d.isToday ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:bg-gray-50'}`}>
                        <span className="font-semibold text-[10px]">{d.label}</span>
                        <span className={`font-bold text-sm mt-0.5 ${d.isToday ? 'text-white' : 'text-gray-700'}`}>{d.date}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl p-5 text-white">
                  <p className="font-bold text-sm mb-1">Boost your visibility</p>
                  <p className="text-xs opacity-80 leading-snug mb-3">
                    Doctors who keep their availability updated receive 3× more bookings.
                  </p>
                  <button className="bg-white text-cyan-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors">
                    Update availability
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorDashboard