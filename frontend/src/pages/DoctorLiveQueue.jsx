import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

const avatarColors = ['bg-cyan-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

function DoctorLiveQueue() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [now, setNow] = useState(new Date())
  const intervalRef = useRef(null)

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchQueue()
    intervalRef.current = setInterval(() => setNow(new Date()), 1000)

    // Real-time: re-fetch whenever appointments change for this doctor today
    const channel = supabase
      .channel('doctor-live-queue')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `doctor_id=eq.${user.id}`,
      }, () => fetchQueue())
      .subscribe()

    return () => {
      clearInterval(intervalRef.current)
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchQueue = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('appointments')
        .select('*, users!appointments_patient_id_fkey(full_name)')
        .eq('doctor_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })
      if (error) throw error
      setQueue((data || []).map(a => ({ ...a, patient_name: a.users?.full_name })))
    } catch {
      setQueue([])
    }
    setLoading(false)
  }

  // Mark current patient as completed in Supabase, which triggers real-time for waiting patients
  const handleDone = async () => {
    if (!current || completing) return
    setCompleting(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', current.id)
      if (error) throw error
      // fetchQueue() will be triggered by the real-time channel automatically,
      // but we also call it directly for immediate local update
      await fetchQueue()
    } catch (err) {
      console.error('Done error:', err)
    }
    setCompleting(false)
  }

  const formatTime = (t) => {
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr % 12 || 12}:${m} ${hr < 12 ? 'AM' : 'PM'}`
  }

  const done = queue.filter(a => a.status === 'completed')
  const remaining = queue.filter(a => a.status === 'confirmed')
  const current = remaining[0] || null
  const waiting = remaining.slice(1)

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-black text-gray-900">Live Queue</h1>
                <p className="text-sm text-gray-400">Today's confirmed patients · {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={fetchQueue} className="text-sm border border-gray-200 bg-white text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">Refresh</button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-300">
                <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Loading queue…
              </div>
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                <p className="text-sm font-medium">No patients in queue today</p>
                <p className="text-xs mt-1">Confirmed appointments will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">

                  {/* Progress bar */}
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-700">Queue Progress</p>
                      <p className="text-xs text-gray-400">{done.length} done · {remaining.length} remaining</p>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-700"
                        style={{ width: `${queue.length ? (done.length / queue.length) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{queue.length} total patients today</p>
                  </div>

                  {/* Current patient card */}
                  {current ? (
                    <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl shadow-md p-6 text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">Now Consulting</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${getColor(current.patient_name)} bg-opacity-30 flex items-center justify-center text-white font-black text-xl border-2 border-white/30`}>
                          {getInitials(current.patient_name)}
                        </div>
                        <div>
                          <p className="text-xl font-black">{current.patient_name}</p>
                          <p className="text-sm opacity-75">{current.issue || 'General consultation'}</p>
                          <p className="text-xs opacity-60 mt-0.5">{formatTime(current.appointment_time)}</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDone}
                        disabled={completing}
                        className="w-full mt-5 bg-white text-cyan-600 font-bold text-sm py-2.5 rounded-xl hover:bg-cyan-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                        {completing ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Marking done…
                          </>
                        ) : (
                          <>✓ Done — Next Patient</>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                      <p className="text-2xl mb-2">🎉</p>
                      <p className="text-sm font-semibold text-gray-600">All patients seen!</p>
                      <p className="text-xs mt-1">Queue complete for today.</p>
                    </div>
                  )}

                  {/* Waiting list */}
                  {waiting.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800">Waiting ({waiting.length})</h2>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {waiting.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 2}</div>
                            <div className={`w-9 h-9 rounded-full ${getColor(p.patient_name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{getInitials(p.patient_name)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{p.patient_name}</p>
                              <p className="text-xs text-gray-400 truncate">{p.issue || 'General consultation'}</p>
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">{formatTime(p.appointment_time)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar summary */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    <h3 className="text-sm font-bold text-gray-800">Today's Summary</h3>
                    {[
                      { label: 'Total scheduled', value: queue.length, color: 'text-gray-800' },
                      { label: 'Completed', value: done.length, color: 'text-green-500' },
                      { label: 'In progress', value: current ? 1 : 0, color: 'text-cyan-500' },
                      { label: 'Waiting', value: waiting.length, color: 'text-amber-500' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">{s.label}</p>
                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {done.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-gray-800">Completed ({done.length})</h3>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {done.map(p => (
                          <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                            <div className={`w-8 h-8 rounded-full ${getColor(p.patient_name)} opacity-50 flex items-center justify-center text-white font-bold text-xs shrink-0`}>{getInitials(p.patient_name)}</div>
                            <p className="text-sm text-gray-400 line-through truncate">{p.patient_name}</p>
                            <span className="ml-auto text-green-400 text-xs">✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorLiveQueue