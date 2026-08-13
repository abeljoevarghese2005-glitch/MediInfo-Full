import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

const avatarColors = ['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'

function MyPrescriptions() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetchPrescriptions()

    const channel = supabase
      .channel('patient-prescriptions')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'prescriptions',
        filter: `patient_id=eq.${user.id}`,
      }, () => fetchPrescriptions())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const fetchPrescriptions = async () => {
    setLoading(true)

    const { data: prescriptionData, error: prescError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })

    if (prescError || !prescriptionData) {
      setLoading(false)
      return
    }

    const appointmentIds = [...new Set(prescriptionData.map(p => p.appointment_id).filter(Boolean))]

    let appointmentsMap = {}
    if (appointmentIds.length > 0) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, doctor_id, users!appointments_doctor_id_fkey(full_name)')
        .in('id', appointmentIds)

      if (appts) {
        const doctorIds = [...new Set(appts.map(a => a.doctor_id).filter(Boolean))]
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
        appts.forEach(a => {
          appointmentsMap[a.id] = { ...a, specialization: specializationById[a.doctor_id] }
        })
      }
    }
    

    const normalized = prescriptionData.map(p => {
      const appt = appointmentsMap[p.appointment_id]
      return {
        ...p,
        doctor_name: appt?.users?.full_name,
        specialization: appt?.specialization,
        appointment_date: appt?.appointment_date,
        appointment_time: appt?.appointment_time,
      }
    })

    setPrescriptions(normalized)
    setLoading(false)
  }

  const filtered = prescriptions.filter(p =>
    !search ||
    p.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.medicines?.some(m => m.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-3xl mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">My Prescriptions</h1>
                <p className="text-cyan-100 text-sm mt-1 font-normal">Medicines prescribed by your doctors</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-bold tracking-tight text-white">{prescriptions.length}</p>
                <p className="text-xs text-cyan-100 font-normal">Total</p>
              </div>
            </div>

            {/* Search bar inside hero */}
            {prescriptions.length > 0 && (
              <div className="mt-5 relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by doctor or medicine…"
                  className="w-full max-w-sm pl-10 pr-4 py-2.5 text-sm bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/30 transition-colors"
                />
              </div>
            )}
          </div>

          {/* ── Page content ── */}
          <div className="flex-1 px-4 sm:px-8 pb-8 max-w-2xl w-full">

            {loading ? (
              <div className="text-gray-400 text-sm font-normal">Loading...</div>
            ) : prescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-semibold tracking-tight mb-1">No prescriptions yet</p>
                <p className="text-gray-400 text-sm font-normal mb-5">Prescriptions from your doctors will appear here</p>
                <button
                  onClick={() => navigate('/doctors')}
                  className="bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold tracking-tight hover:bg-emerald-500 transition-colors"
                >
                  Find a Doctor
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-gray-400 text-sm font-normal py-8 text-center">No prescriptions match your search</div>
            ) : (
              <div className="space-y-3">
                {filtered.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div
                      className="flex items-center gap-4 p-5 cursor-pointer hover:bg-green-50 transition-colors"
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    >
                      <div className={`w-11 h-11 ${getColor(p.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {getInitials(p.doctor_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold tracking-tight text-gray-900 text-sm truncate">Dr. {p.doctor_name || 'Unknown'}</p>
                        <p className="text-emerald-600 text-xs font-medium">{p.specialization || 'General Physician'}</p>
                        <p className="text-xs text-gray-400 font-normal mt-0.5">
                          {fmt(p.appointment_date)} · {p.medicines?.length} medicine{p.medicines?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="text-gray-300 text-sm shrink-0">{expanded === p.id ? '▲' : '▼'}</span>
                    </div>

                    {expanded === p.id && (
                      <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                        <div className="space-y-2">
                          {p.medicines?.map((med, idx) => (
                            <div key={idx} className="bg-green-50 rounded-xl px-4 py-3 hover:bg-green-100 transition-colors">
                              <p className="text-sm font-semibold tracking-tight text-gray-800">{med.name}</p>
                              <div className="flex flex-wrap gap-3 mt-1">
                                {med.dosage && <span className="text-xs text-gray-500 font-normal">💊 {med.dosage}</span>}
                                {med.frequency && <span className="text-xs text-gray-500 font-normal">🔁 {med.frequency}</span>}
                                {med.duration && <span className="text-xs text-gray-500 font-normal">📅 {med.duration}</span>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {p.notes && (
                          <div className="bg-emerald-50 rounded-xl px-4 py-2.5">
                            <p className="text-xs font-semibold text-emerald-700 mb-0.5">Doctor's Notes</p>
                            <p className="text-xs text-gray-600 font-normal">{p.notes}</p>
                          </div>
                        )}

                        <p className="text-[10px] text-gray-300 font-normal">
                          Prescribed on {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default MyPrescriptions