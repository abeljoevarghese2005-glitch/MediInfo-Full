import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import LocationBar from '../components/LocationBar'
import { supabase } from '../lib/supabase'

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

const getWeekDays = (weekStart) => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const todayStr = new Date().toLocaleDateString('en-CA')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const dateStr = d.toLocaleDateString('en-CA')
    return {
      label: days[d.getDay()],
      date: d.getDate(),
      dateStr,
      isToday: dateStr === todayStr,
      fullDate: new Date(d),
    }
  })
}

const getWeekStart = (date) => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const BOOST_VISIBILITY_KEY = 'mediinfo_boost_visibility_dismissed_at'
const BOOST_VISIBILITY_COOLDOWN_DAYS = 30

function StatCard({ icon, value, label, sub, subColor = 'text-cyan-500' }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-gray-300">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        {sub && <p className={`text-xs font-semibold mt-0.5 ${subColor}`}>{sub}</p>}
      </div>
    </div>
  )
}

function DoctorDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [nearbyPatients, setNearbyPatients] = useState([])

  const todayStr = new Date().toLocaleDateString('en-CA')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr)
  const weekDays = getWeekDays(weekStart)

  // Boost Visibility card: shown only once every 30 days (rolling from last
  // dismissal), and can be closed by the doctor. Re-appears automatically
  // once the cooldown window has passed since the last time it was closed.
  const [showBoostCard, setShowBoostCard] = useState(false)

  useEffect(() => {
    try {
      const lastDismissed = localStorage.getItem(BOOST_VISIBILITY_KEY)
      if (!lastDismissed) {
        setShowBoostCard(true)
        return
      }
      const daysSince = (Date.now() - Number(lastDismissed)) / (1000 * 60 * 60 * 24)
      setShowBoostCard(daysSince >= BOOST_VISIBILITY_COOLDOWN_DAYS)
    } catch {
      setShowBoostCard(true)
    }
  }, [])

  const dismissBoostCard = () => {
    try {
      localStorage.setItem(BOOST_VISIBILITY_KEY, String(Date.now()))
    } catch {}
    setShowBoostCard(false)
  }

  const weekLabel = (() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 6)
    const opts = { day: 'numeric', month: 'short' }
    return `${weekStart.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`
  })()

  const goToPrevWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d })
  const goToNextWeek = () => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d })
  const goToToday = () => { setWeekStart(getWeekStart(new Date())); setSelectedDateStr(todayStr) }

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchAppointments()

    const channel = supabase
      .channel('doctor-appointments')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `doctor_id=eq.${user.id}`,
      }, () => fetchAppointments())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const handleLocationReady = useCallback(async (loc) => {
    if (!loc) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nearby-patients?lat=${loc.lat}&lng=${loc.lng}&radius=25`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      setNearbyPatients(Array.isArray(data) ? data : [])
    } catch {}
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select('*, users!appointments_patient_id_fkey(full_name)')
      .eq('doctor_id', user.id)
      .order('appointment_date', { ascending: true })

    if (!error && data) {
      setAppointments(data.map(a => ({
        ...a,
        patient_name: a.source === 'walkin' ? a.walkin_name : a.users?.full_name,
      })))
    }
    setLoading(false)
  }

  const today = new Date().toLocaleDateString('en-CA')
  const todayCount = appointments.filter(a => a.appointment_date === today).length
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length

  // Weekly stats
  const weekStartStr = weekStart.toLocaleDateString('en-CA')
  const weekEndDate = new Date(weekStart)
  weekEndDate.setDate(weekStart.getDate() + 6)
  const weekEndStr = weekEndDate.toLocaleDateString('en-CA')
  const weekAppts = appointments.filter(a => a.appointment_date >= weekStartStr && a.appointment_date <= weekEndStr)
  const weekCompleted = weekAppts.filter(a => a.status === 'completed' || a.status === 'confirmed').length
  const weekTotal = weekAppts.length
  const completionRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

  // Upcoming: next 5 from today onward, excluding cancelled AND completed
  // (a "completed" appointment has already happened — it doesn't belong in
  // an "upcoming" list regardless of its date/time), sorted so the soonest
  // appointment is always first (date, then time within the same day).
  const upcoming5 = appointments
    .filter(a => a.appointment_date >= today && a.status !== 'cancelled' && a.status !== 'completed')
    .sort((a, b) => {
      if (a.appointment_date !== b.appointment_date) {
        return a.appointment_date.localeCompare(b.appointment_date)
      }
      return (a.appointment_time || '').localeCompare(b.appointment_time || '')
    })
    .slice(0, 5)

  // Selected-day appointments: every appointment on the date currently
  // selected in the calendar widget, shown in the panel below it.
  const selectedDayAppointments = appointments
    .filter(a => a.appointment_date === selectedDateStr)
    .sort((a, b) => (a.appointment_time || '').localeCompare(b.appointment_time || ''))

  // Recent activity: last 5 non-pending
  const recentActivity = [...appointments]
    .filter(a => a.status !== 'pending')
    .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
    .slice(0, 5)

  const countForDate = (dateStr) => appointments.filter(a => a.appointment_date === dateStr).length

  const fmtDate = (d) => {
    if (d === today) return 'Today'
    const dt = new Date(d)
    return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const fmtSelectedDateLabel = (dateStr) => {
    if (dateStr === today) return 'Today'
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (dateStr === tomorrow.toLocaleDateString('en-CA')) return 'Tomorrow'
    return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
  }

  const activityMeta = (status) => {
    if (status === 'confirmed') return { icon: '✅', color: 'text-green-500', bg: 'bg-green-50', label: 'Accepted' }
    if (status === 'cancelled') return { icon: '❌', color: 'text-red-500', bg: 'bg-red-50', label: 'Cancelled' }
    if (status === 'completed') return { icon: '🏁', color: 'text-gray-500', bg: 'bg-gray-50', label: 'Completed' }
    return { icon: '⏳', color: 'text-amber-500', bg: 'bg-amber-50', label: 'Pending' }
  }

  const statusStyles = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-gray-100 text-gray-500',
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-sm shrink-0">
                  {user.full_name?.charAt(0).toUpperCase() || 'D'}
                </div>
                <div>
                  <p className="text-sm text-gray-400">{greeting()}</p>
                  <h1 className="text-2xl font-black text-gray-900">Dr. {user.full_name}</h1>
                  <p className="text-sm text-gray-500">{user.specialization || 'General Physician'}</p>
                </div>
              </div>
            </div>

            <LocationBar onLocationReady={handleLocationReady} />

            {/* Nearby patients */}
            {nearbyPatients.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1">📍 Nearby patients who've booked you</h2>
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
                        {p.distance_km?.toFixed(1)} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="📅" value={todayCount} label="Today's patients" sub="+12%" subColor="text-green-500" />
              <StatCard icon="⚡" value={pendingCount} label="Pending requests"
                sub={pendingCount > 0 ? 'Action needed' : 'All clear'}
                subColor={pendingCount > 0 ? 'text-amber-500' : 'text-green-500'} />
              <StatCard icon="👥" value={confirmedCount} label="Accepted" sub="This week" subColor="text-cyan-500" />
              <StatCard icon="⭐" value={user.rating || 4.9} label="Rating" sub="232 reviews" subColor="text-gray-400" />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/doctor-appointments')}
                  className="flex items-center gap-3 px-4 py-3.5 bg-cyan-50 hover:bg-cyan-100 rounded-xl transition-colors">
                  <span className="text-xl">🚶</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">Walk-in</p>
                    <p className="text-xs text-gray-400">Add patient now</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/doctor-prescriptions')}
                  className="flex items-center gap-3 px-4 py-3.5 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors">
                  <span className="text-xl">💊</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">Add Prescription</p>
                    <p className="text-xs text-gray-400">Write & send</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/doctor-profile')}
                  className="flex items-center gap-3 px-4 py-3.5 bg-green-50 hover:bg-green-100 rounded-xl transition-colors">
                  <span className="text-xl">📅</span>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-800">Update Availability</p>
                    <p className="text-xs text-gray-400">Manage schedule</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Left column */}
              <div className="xl:col-span-2 space-y-6">

                {/* Upcoming Appointments Widget */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-gray-800">Upcoming Appointments</h2>
                      <p className="text-xs text-gray-400">Next 5 scheduled</p>
                    </div>
                    <button
                      onClick={() => navigate('/doctor-appointments')}
                      className="text-xs font-semibold text-cyan-600 border border-cyan-200 px-3 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors">
                      View All →
                    </button>
                  </div>
                  <div className="divide-y divide-gray-50 min-h-[120px]">
                    {loading ? (
                      <div className="flex items-center justify-center py-10 text-gray-300 text-sm">Loading…</div>
                    ) : upcoming5.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                        <p className="text-sm">No upcoming appointments</p>
                      </div>
                    ) : (
                      upcoming5.map(appt => (
                        <div key={appt.id} className="flex items-center gap-4 py-3.5 px-5 hover:bg-gray-50 transition-colors">
                          <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
                            {appt.patient_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800 truncate">{appt.patient_name || 'Walk-in Patient'}</p>
                              {appt.source === 'walkin' && (
                                <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full shrink-0">Walk-in</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{appt.issue || 'General consultation'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-gray-700">{fmtDate(appt.appointment_date)}</p>
                            <p className="text-xs text-gray-400">{appt.appointment_time}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize shrink-0 ${statusStyles[appt.status] || 'bg-gray-100 text-gray-500'}`}>
                            {appt.status === 'confirmed' ? 'Accepted' : appt.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  {upcoming5.length > 0 && (
                    <div className="px-5 py-3 border-t border-gray-100">
                      <button
                        onClick={() => navigate('/doctor-appointments')}
                        className="w-full text-xs text-cyan-500 font-semibold py-1.5 rounded-lg hover:bg-cyan-50 transition-colors">
                        View all appointments →
                      </button>
                    </div>
                  )}
                </div>

                {/* Weekly Performance */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-800 mb-4">Weekly Performance</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-cyan-50 rounded-xl py-4">
                      <p className="text-2xl font-black text-cyan-600">{weekTotal}</p>
                      <p className="text-xs text-gray-400 mt-1">This week</p>
                    </div>
                    <div className="text-center bg-green-50 rounded-xl py-4">
                      <p className="text-2xl font-black text-green-600">{completionRate}%</p>
                      <p className="text-xs text-gray-400 mt-1">Completion rate</p>
                    </div>
                    <div className="text-center bg-amber-50 rounded-xl py-4">
                      <p className="text-2xl font-black text-amber-500">{user.rating || '4.9'} ⭐</p>
                      <p className="text-xs text-gray-400 mt-1">Avg rating</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity — commented out for now since it largely
                    overlaps with Upcoming Appointments / the selected-day
                    panel while test data is all clustered on one day. The
                    underlying `recentActivity` data and `activityMeta`
                    helper above are left untouched — to bring this back,
                    just uncomment the block below.
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h2 className="text-sm font-bold text-gray-800 mb-4">Recent Activity</h2>
                  {loading ? (
                    <div className="text-sm text-gray-300 text-center py-4">Loading…</div>
                  ) : recentActivity.length === 0 ? (
                    <div className="text-sm text-gray-300 text-center py-4">No recent activity</div>
                  ) : (
                    <div className="space-y-2">
                      {recentActivity.map(appt => {
                        const { icon, color, bg, label } = activityMeta(appt.status)
                        return (
                          <div key={appt.id} className={`flex items-center gap-3 px-3 py-2.5 ${bg} rounded-xl`}>
                            <span className="text-base shrink-0">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {appt.patient_name || 'Walk-in Patient'}
                              </p>
                              <p className="text-xs text-gray-400">{fmtDate(appt.appointment_date)} · {appt.appointment_time}</p>
                            </div>
                            <span className={`text-xs font-bold shrink-0 ${color}`}>{label}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                */}

              </div>

              {/* Right column: Profile + Calendar + Selected-day panel */}
              <div className="space-y-4">

                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Profile</h3>
                  <div className="space-y-2.5">
                    {[
                      { icon: '🏥', text: user.clinic_name || 'Clinic not set' },
                      { icon: '📧', text: user.email || 'Email not set' },
                      { icon: '📞', text: user.phone || '—' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-2.5">
                        <span>{row.icon}</span>
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

                {/* Calendar */}
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={goToPrevWeek}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-sm">
                      ‹
                    </button>
                    <h3 className="text-xs font-bold text-gray-800">{weekLabel}</h3>
                    <button onClick={goToNextWeek}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-sm">
                      ›
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {weekDays.map((d, i) => {
                      const isSelected = d.dateStr === selectedDateStr
                      const count = countForDate(d.dateStr)
                      return (
                        <button key={i} onClick={() => setSelectedDateStr(d.dateStr)}
                          className={`flex flex-col items-center py-2 rounded-xl text-xs transition-colors relative ${
                            isSelected
                              ? 'bg-cyan-500 text-white shadow-sm'
                              : d.isToday
                              ? 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}>
                          <span className="font-semibold text-[10px]">{d.label}</span>
                          <span className={`font-bold text-sm mt-0.5 ${isSelected ? 'text-white' : d.isToday ? 'text-cyan-600' : 'text-gray-700'}`}>
                            {d.date}
                          </span>
                          {count > 0 && (
                            <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-cyan-400'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {selectedDateStr !== todayStr && (
                    <button onClick={goToToday}
                      className="w-full mt-3 text-xs text-cyan-500 font-semibold py-1.5 rounded-lg hover:bg-cyan-50 transition-colors">
                      Back to today
                    </button>
                  )}
                </div>

                {/* Selected-day appointments panel — replaces the old
                    always-visible Boost Visibility card. Matches the height
                    of the Recent Activity panel, scrolls internally if the
                    selected day has more appointments than fit. */}
                <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col" style={{ height: '320px' }}>
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <h3 className="text-sm font-bold text-gray-800">{fmtSelectedDateLabel(selectedDateStr)}</h3>
                    <span className="text-[11px] bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                      {selectedDayAppointments.length} appt{selectedDayAppointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {loading ? (
                      <div className="text-sm text-gray-300 text-center py-4">Loading…</div>
                    ) : selectedDayAppointments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-300">
                        <p className="text-sm">No appointments on this day</p>
                      </div>
                    ) : (
                      selectedDayAppointments.map(appt => (
                        <div key={appt.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                          <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 font-bold text-xs flex items-center justify-center shrink-0">
                            {appt.patient_name?.charAt(0).toUpperCase() || appt.walkin_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {appt.patient_name || appt.walkin_name || 'Walk-in Patient'}
                            </p>
                            <p className="text-xs text-gray-400">{appt.appointment_time}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize shrink-0 ${statusStyles[appt.status] || 'bg-gray-100 text-gray-500'}`}>
                            {appt.status === 'confirmed' ? 'Accepted' : appt.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Boost Visibility — only shown once every 30 days since
                    last dismissal, dismissible via the close button */}
                {showBoostCard && (
                  <div className="relative bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl p-5 text-white">
                    <button onClick={dismissBoostCard}
                      className="absolute top-3 right-3 text-white/70 hover:text-white text-sm leading-none w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                      ✕
                    </button>
                    <p className="font-bold text-sm mb-1 pr-6">Boost your visibility</p>
                    <p className="text-xs opacity-80 leading-snug mb-3">Keep your availability updated to get more bookings.</p>
                    <button onClick={() => navigate('/doctor-profile')}
                      className="bg-white text-cyan-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors">
                      Update availability
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorDashboard