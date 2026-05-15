import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import LocationBar from '../components/LocationBar'
import { supabase } from '../lib/supabase'
import { getNearbyPatients } from '../api/index'

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

function AppointmentRow({ appt, onConfirm, onReject, acting }) {
  const statusStyles = {
    confirmed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
  }
  const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="flex items-center gap-4 py-3.5 px-4 rounded-xl hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
        {appt.patient_name?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{appt.patient_name}</p>
        <p className="text-xs text-gray-400 truncate">{appt.issue || 'General consultation'}</p>
      </div>
      <div className="hidden sm:block text-right shrink-0">
        <p className="text-xs font-medium text-gray-600">{fmt(appt.appointment_date)}</p>
        <p className="text-xs text-gray-400">{appt.appointment_time}</p>
      </div>
      {appt.status === 'pending' ? (
        <div className="flex gap-2 shrink-0">
          <button onClick={() => onConfirm(appt.id)} disabled={acting === appt.id}
            className="px-3 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors">
            {acting === appt.id ? '…' : 'Accept'}
          </button>
          <button onClick={() => onReject(appt.id)} disabled={acting === appt.id}
            className="px-3 py-1.5 border border-red-200 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
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

    // Real-time subscription
    const channel = supabase
      .channel('doctor-appointments')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `doctor_id=eq.${user.id}`,
      }, () => fetchAppointments())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const handleLocationReady = useCallback((loc) => {
    if (!loc) return
    getNearbyPatients(loc.lat, loc.lng, 25)
      .then(res => setNearbyPatients(res.data))
      .catch(() => {})
  }, [])

  const fetchAppointments = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('appointments')
      .select('*, users!appointments_patient_id_fkey(full_name)')
      .eq('doctor_id', user.id)
      .order('appointment_date', { ascending: true })

    if (!error && data) {
      const normalized = data.map(a => ({
        ...a,
        patient_name: a.users?.full_name,
      }))
      setAppointments(normalized)
    }
    setLoading(false)
  }

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

  const today = new Date().toISOString().split('T')[0]
  const todayCount = appointments.filter(a => a.appointment_date?.startsWith(today)).length
  const pendingCount = appointments.filter(a => a.status === 'pending').length
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length

  const filterTabs = [
    { key: 'pending', label: `Pending (${pendingCount})` },
    { key: 'confirmed', label: `Accepted (${confirmedCount})` },
    { key: 'cancelled', label: `Rejected (${appointments.filter(a => a.status === 'cancelled').length})` },
    { key: 'all', label: `All (${appointments.length})` },
  ]

  const displayed = appointments.filter(a => {
    const matchFilter = filter === 'all' || a.status === filter
    const matchSearch = !search ||
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
                        {p.distance_km.toFixed(1)} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon="📅" value={todayCount} label="Today's patients" sub="+12%" subColor="text-green-500" />
              <StatCard icon="⚡" value={pendingCount} label="Pending requests"
                sub={pendingCount > 0 ? 'Action needed' : 'All clear'}
                subColor={pendingCount > 0 ? 'text-amber-500' : 'text-green-500'} />
              <StatCard icon="👥" value={confirmedCount} label="Accepted" sub="This week" subColor="text-cyan-500" />
              <StatCard icon="⭐" value={user.rating || 4.9} label="Rating" sub="232 reviews" subColor="text-gray-400" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">Appointments</h2>
                    <p className="text-xs text-gray-400">Real-time updates via Supabase</p>
                  </div>
                  <button onClick={fetchAppointments} className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    Refresh
                  </button>
                </div>

                <div className="px-5 py-3 border-b border-gray-100">
                  <div className="relative">
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search patient or issue..."
                      className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
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
                    <div className="flex items-center justify-center py-16 text-gray-300">Loading…</div>
                  ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                      <p className="text-sm">No {filter === 'all' ? '' : filter} appointments</p>
                    </div>
                  ) : (
                    displayed.map(appt => (
                      <AppointmentRow key={appt.id} appt={appt} onConfirm={handleConfirm} onReject={handleReject} acting={acting} />
                    ))
                  )}
                </div>
              </div>

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

                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-800">This week</h3>
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
                  <p className="text-xs opacity-80 leading-snug mb-3">Keep your availability updated to get more bookings.</p>
                  <button onClick={() => navigate('/doctor-profile')}
                    className="bg-white text-cyan-600 text-xs font-bold px-4 py-2 rounded-lg hover:bg-cyan-50 transition-colors">
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