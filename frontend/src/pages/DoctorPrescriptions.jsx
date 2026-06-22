import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

function DoctorPrescriptions() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchPrescriptions()
  }, [])

  const fetchPrescriptions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, appointments(appointment_date, appointment_time, issue, source, walkin_name, walkin_age, walkin_phone, users!appointments_patient_id_fkey(full_name))')
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const normalized = data.map(p => ({
        ...p,
        patient_name: p.appointments?.source === 'walkin'
          ? p.appointments?.walkin_name
          : p.appointments?.users?.full_name,
        appointment_date: p.appointments?.appointment_date,
        appointment_time: p.appointments?.appointment_time,
        issue: p.appointments?.issue,
        walkin_age: p.appointments?.walkin_age,
        walkin_phone: p.appointments?.walkin_phone,
        is_walkin: p.appointments?.source === 'walkin',
      }))
      setPrescriptions(normalized)
    }
    setLoading(false)
  }

  const filtered = prescriptions.filter(p =>
    !search ||
    p.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.medicines?.some(m => m.name?.toLowerCase().includes(search.toLowerCase()))
  )

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-5">

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black text-gray-900">Prescriptions</h1>
                <p className="text-sm text-gray-400">All prescriptions you've written</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm px-4 py-2 text-center">
                <p className="text-xl font-bold text-cyan-500">{prescriptions.length}</p>
                <p className="text-xs text-gray-400">Total</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by patient name or medicine…"
                  className="w-full max-w-sm pl-4 pr-4 py-2 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-gray-300">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="text-sm">No prescriptions found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <div key={p.id} className="px-5 py-4">
                      <div
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-600 font-bold text-sm flex items-center justify-center shrink-0">
                          {p.patient_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">{p.patient_name || 'Unknown'}</p>
                            {p.is_walkin && (
                              <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full shrink-0">
                                Walk-in
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {fmt(p.appointment_date)} · {p.appointment_time} · {p.medicines?.length} medicine{p.medicines?.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="text-gray-300 text-sm">{expanded === p.id ? '▲' : '▼'}</span>
                      </div>

                      {expanded === p.id && (
                        <div className="mt-3 ml-13 space-y-3">
                          {p.is_walkin && (
                            <div className="bg-orange-50 rounded-xl px-4 py-2.5 text-xs text-gray-600">
                              Age {p.walkin_age} · {p.walkin_phone}
                            </div>
                          )}

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
                              <p className="text-xs font-semibold text-cyan-700 mb-0.5">Notes</p>
                              <p className="text-xs text-gray-600">{p.notes}</p>
                            </div>
                          )}

                          <p className="text-[10px] text-gray-300">
                            Written on {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
      </div>
    </SidebarProvider>
  )
}

export default DoctorPrescriptions