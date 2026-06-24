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

    // Realtime: instantly show new prescriptions written for this patient
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
  
  // Step 1: Get all prescriptions for this patient
  const { data: prescriptionData, error: prescError } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  if (prescError || !prescriptionData) {
    setLoading(false)
    return
  }

  // Step 2: Get the related appointment details for each prescription
  const appointmentIds = [...new Set(prescriptionData.map(p => p.appointment_id).filter(Boolean))]
  
  let appointmentsMap = {}
  if (appointmentIds.length > 0) {
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, doctor_id, users!appointments_doctor_id_fkey(full_name, specialization)')
      .in('id', appointmentIds)
    
    if (appts) {
      appts.forEach(a => { appointmentsMap[a.id] = a })
    }
  }

  // Step 3: Merge prescription + appointment data
  const normalized = prescriptionData.map(p => {
    const appt = appointmentsMap[p.appointment_id]
    return {
      ...p,
      doctor_name: appt?.users?.full_name,
      specialization: appt?.users?.specialization,
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
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />
          <div className="flex-1 px-4 sm:px-8 py-8">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900">My Prescriptions</h1>
                <p className="text-gray-400 text-sm mt-0.5">Medicines prescribed by your doctors</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm px-4 py-2 text-center">
                <p className="text-xl font-bold text-cyan-500">{prescriptions.length}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
            </div>

            {prescriptions.length > 0 && (
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by doctor or medicine…"
                className="w-full max-w-sm mb-5 pl-4 pr-4 py-2.5 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
            )}

            {loading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : prescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-bold mb-1">No prescriptions yet</p>
                <p className="text-gray-400 text-sm mb-5">Prescriptions from your doctors will appear here</p>
                <button onClick={() => navigate('/doctors')}
                  className="bg-cyan-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-cyan-600">
                  Find a Doctor
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-gray-400 text-sm py-8 text-center">No prescriptions match your search</div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {filtered.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div
                      className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                      <div className={`w-11 h-11 ${getColor(p.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                        {getInitials(p.doctor_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">Dr. {p.doctor_name || 'Unknown'}</p>
                        <p className="text-cyan-500 text-xs">{p.specialization || 'General Physician'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {fmt(p.appointment_date)} · {p.medicines?.length} medicine{p.medicines?.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="text-gray-300 text-sm shrink-0">{expanded === p.id ? '▲' : '▼'}</span>
                    </div>

                    {expanded === p.id && (
                      <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                        <div className="space-y-2">
                          {p.medicines?.map((med, idx) => (
                            <div key={idx} className="bg-gray-50 rounded-xl px-4 py-3">
                              <p className="text-sm font-bold text-gray-800">{med.name}</p>
                              <div className="flex flex-wrap gap-3 mt-1">
                                {med.dosage && <span className="text-xs text-gray-500">💊 {med.dosage}</span>}
                                {med.frequency && <span className="text-xs text-gray-500">🔁 {med.frequency}</span>}
                                {med.duration && <span className="text-xs text-gray-500">📅 {med.duration}</span>}
                              </div>
                            </div>
                          ))}
                        </div>

                        {p.notes && (
                          <div className="bg-cyan-50 rounded-xl px-4 py-2.5">
                            <p className="text-xs font-semibold text-cyan-700 mb-0.5">Doctor's Notes</p>
                            <p className="text-xs text-gray-600">{p.notes}</p>
                          </div>
                        )}

                        <p className="text-[10px] text-gray-300">
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