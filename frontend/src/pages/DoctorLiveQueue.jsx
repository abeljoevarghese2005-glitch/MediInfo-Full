import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import PrescriptionModal from '../components/PrescriptionModal'
import { supabase } from '../lib/supabase'

const avatarColors = ['bg-cyan-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

// --- Home Visit display: mode badge meta (NEW) ---
const MODE_BADGE = {
  in_clinic: { label: 'In-clinic', icon: '🏥' },
  video: { label: 'Video', icon: '🎥' },
  home_visit: { label: 'Home visit', icon: '🏠' },
}

function DoctorLiveQueue() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [now, setNow] = useState(new Date())
  const [prescribeTarget, setPrescribeTarget] = useState(null) // ✅ NEW
  const [toastMsg, setToastMsg] = useState('') // ✅ NEW
  const intervalRef = useRef(null)

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchQueue()
    intervalRef.current = setInterval(() => setNow(new Date()), 1000)

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
      const today = new Date().toLocaleDateString('en-CA')
      const { data, error } = await supabase
        .from('appointments')
        .select('*, users!appointments_patient_id_fkey(full_name)')
        .eq('doctor_id', user.id)
        .in('status', ['confirmed', 'completed'])
        .eq('appointment_date', today)
        // Video consultations have their own dedicated flow (Join Video
        // Consultation button), so they're excluded from the in-person
        // live queue entirely. Everything else (in_clinic, home_visit, and any
        // appointment without a consultation_type set) behaves exactly
        // as before.
        .neq('consultation_type', 'video')
        .order('appointment_time', { ascending: true })
      if (error) throw error
      setQueue((data || []).map(a => ({
        ...a,
        patient_name: a.source === 'walkin' ? a.walkin_name : a.users?.full_name,
      })))
    } catch {
      setQueue([])
    }
    setLoading(false)
  }

  const handleDone = async () => {
    if (!current || completing) return
    setCompleting(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', current.id)
      if (error) throw error
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

  // --- Home Visit display: mode badge component (NEW) ---
  const ModeBadge = ({ type }) => {
    const meta = MODE_BADGE[type] || MODE_BADGE.in_clinic
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
        {meta.icon} {meta.label}
      </span>
    )
  }

  const WaitingModeBadge = ({ type }) => {
    const meta = MODE_BADGE[type] || MODE_BADGE.in_clinic
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
        {meta.icon} {meta.label}
      </span>
    )
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />

        {/* Prescription modal */}
        {prescribeTarget && (
          <PrescriptionModal
            appointment={prescribeTarget}
            onClose={() => setPrescribeTarget(null)}
            onSaved={(msg) => {
              setToastMsg(msg)
              setTimeout(() => setToastMsg(''), 4000)
            }}
          />
        )}

        {/* simple toast */}
        {toastMsg && (
          <div className="fixed top-5 right-5 z-50 bg-cyan-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
            🔔 {toastMsg}
          </div>
        )}

        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl font-black text-gray-900">{t('doctorLiveQueue.header.title')}</h1>
                <p className="text-sm text-gray-400">{t('doctorLiveQueue.header.subtitle')} · {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <button onClick={fetchQueue} className="text-sm border border-gray-200 bg-white text-gray-500 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors">{t('doctorLiveQueue.header.refresh')}</button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-gray-300">
                <svg className="w-6 h-6 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('doctorLiveQueue.loading')}
              </div>
            ) : queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                <p className="text-sm font-medium">{t('doctorLiveQueue.empty.title')}</p>
                <p className="text-xs mt-1">{t('doctorLiveQueue.empty.subtitle')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-4">

                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-700">{t('doctorLiveQueue.progress.title')}</p>
                      <p className="text-xs text-gray-400">{t('doctorLiveQueue.progress.status', { done: done.length, remaining: remaining.length })}</p>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 rounded-full transition-all duration-700"
                        style={{ width: `${queue.length ? (done.length / queue.length) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{t('doctorLiveQueue.progress.totalToday', { count: queue.length })}</p>
                  </div>

                  {current ? (
                    <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-2xl shadow-md p-6 text-white">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t('doctorLiveQueue.current.nowConsulting')}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${getColor(current.patient_name)} bg-opacity-30 flex items-center justify-center text-white font-black text-xl border-2 border-white/30`}>
                          {getInitials(current.patient_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xl font-black">{current.patient_name}</p>
                            <ModeBadge type={current.consultation_type} />
                          </div>
                          <p className="text-sm opacity-75">{current.issue || t('doctorLiveQueue.issueFallback')}</p>
                          <p className="text-xs opacity-60 mt-0.5">{formatTime(current.appointment_time)}</p>
                        </div>
                      </div>

                      {/* --- Home Visit details block (NEW) --- */}
                      {current.consultation_type === 'home_visit' && current.home_visit_details && (
                        <div className="mt-4 bg-white/10 border border-white/20 rounded-xl p-4 space-y-3 text-sm">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-0.5">Visit address</p>
                              <p className="opacity-95 break-words">{current.home_visit_details.address}</p>
                              {current.home_visit_details.landmark && (
                                <p className="opacity-70 text-xs mt-0.5">Landmark: {current.home_visit_details.landmark}</p>
                              )}
                              <p className="opacity-70 text-xs mt-0.5">
                                {current.home_visit_details.address_type}
                                {current.home_visit_details.floor && ` · Floor: ${current.home_visit_details.floor}`}
                                {current.home_visit_details.lift_available ? ' · Lift available' : ' · No lift'}
                              </p>
                            </div>
                            {current.home_visit_details.maps_link && (
                              <a href={current.home_visit_details.maps_link} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-1.5 bg-white text-cyan-700 font-bold text-xs px-3 py-2 rounded-lg hover:bg-cyan-50 transition-colors">
                                📍 Open in Maps
                              </a>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-0.5">Patient being visited</p>
                              <p className="opacity-95">{current.home_visit_details.patient_name}, {current.home_visit_details.patient_age}, {current.home_visit_details.patient_gender}</p>
                              <p className="opacity-70 text-xs">{current.home_visit_details.relation === 'self' ? 'Account holder' : 'Family member'} · 📞 {current.home_visit_details.contact_number}</p>
                            </div>
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-0.5">Reason & mobility</p>
                              <p className="opacity-95">{current.home_visit_details.chief_complaint}</p>
                              <p className="opacity-70 text-xs">{current.home_visit_details.mobility_status}</p>
                            </div>
                          </div>

                          {current.home_visit_details.on_site_requirements?.length > 0 && (
                            <div className="border-t border-white/10 pt-3">
                              <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mb-1.5">On-site requirements</p>
                              <div className="flex flex-wrap gap-1.5">
                                {current.home_visit_details.on_site_requirements.map(req => (
                                  <span key={req} className="bg-white/15 text-xs px-2 py-1 rounded-full">{req}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-white/10 pt-3 flex items-center justify-between flex-wrap gap-2">
                            <p className="text-xs opacity-80">
                              ₹{current.home_visit_details.consultation_fee} + ₹{current.home_visit_details.home_visit_surcharge} home visit = <span className="font-bold">₹{current.home_visit_details.total_fee}</span>
                            </p>
                            <span className="text-xs font-semibold bg-white/15 px-2 py-1 rounded-full">
                              {current.home_visit_details.payment_mode === 'pay_now' ? '💳 Pay now' : '💵 Pay after visit'}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* --- end Home Visit details block --- */}

                        <div className="flex gap-2 mt-5">
                        <button
                          onClick={() => setPrescribeTarget(current)}
                          className="flex-1 bg-white/15 border border-white/30 text-white font-bold text-sm py-2.5 rounded-xl hover:bg-white/25 transition-colors">
                          📝 Prescribe
                        </button>
                        <button
                          onClick={handleDone}
                          disabled={completing}
                          className="flex-1 bg-white text-cyan-600 font-bold text-sm py-2.5 rounded-xl hover:bg-cyan-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                          {completing ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              {t('doctorLiveQueue.current.markingDone')}
                            </>
                          ) : (
                            <>✓ {t('doctorLiveQueue.current.doneNextPatient')}</>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
                      <p className="text-2xl mb-2">🎉</p>
                      <p className="text-sm font-semibold text-gray-600">{t('doctorLiveQueue.allSeen.title')}</p>
                      <p className="text-xs mt-1">{t('doctorLiveQueue.allSeen.subtitle')}</p>
                    </div>
                  )}

                  {waiting.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-800">{t('doctorLiveQueue.waiting.title', { count: waiting.length })}</h2>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {waiting.map((p, i) => (
                          <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
                            <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0">{i + 2}</div>
                            <div className={`w-9 h-9 rounded-full ${getColor(p.patient_name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>{getInitials(p.patient_name)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-gray-800 truncate">{p.patient_name}</p>
                                <WaitingModeBadge type={p.consultation_type} />
                              </div>
                              <p className="text-xs text-gray-400 truncate">{p.issue || t('doctorLiveQueue.issueFallback')}</p>
                              {/* Home Visit: compact address link (NEW) */}
                              {p.consultation_type === 'home_visit' && p.home_visit_details?.maps_link && (
                                <a href={p.home_visit_details.maps_link} target="_blank" rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-cyan-600 text-xs font-semibold hover:underline inline-flex items-center gap-1 mt-0.5">
                                  📍 View address
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 shrink-0">{formatTime(p.appointment_time)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
                    <h3 className="text-sm font-bold text-gray-800">{t('doctorLiveQueue.summary.title')}</h3>
                    {[
                      { label: t('doctorLiveQueue.summary.totalScheduled'), value: queue.length, color: 'text-gray-800' },
                      { label: t('doctorLiveQueue.summary.completed'), value: done.length, color: 'text-green-500' },
                      { label: t('doctorLiveQueue.summary.inProgress'), value: current ? 1 : 0, color: 'text-cyan-500' },
                      { label: t('doctorLiveQueue.summary.waiting'), value: waiting.length, color: 'text-amber-500' },
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
                        <h3 className="text-sm font-bold text-gray-800">{t('doctorLiveQueue.completedSection.title', { count: done.length })}</h3>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {done.map(p => (
                          <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                            <div className={`w-8 h-8 rounded-full ${getColor(p.patient_name)} opacity-50 flex items-center justify-center text-white font-bold text-xs shrink-0`}>{getInitials(p.patient_name)}</div>
                            <p className="text-sm text-gray-400 line-through truncate flex-1">{p.patient_name}</p>
                            {/* allow prescribing for already-completed patients too */}
                            <button
                              onClick={() => setPrescribeTarget(p)}
                              className="text-cyan-500 text-xs font-semibold hover:underline shrink-0">
                              Prescribe
                            </button>
                            <span className="text-green-400 text-xs">✓</span>
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