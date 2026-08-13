import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from '../components/TopBar'
import LocationBar from '../components/LocationBar'
import { supabase } from '../lib/supabase'
import { translateSpecialization } from '../utils/specializations'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function generateSlots(start, end, duration = 15) {
  const slots = []
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let current = sh * 60 + sm
  const endMin = eh * 60 + em
  while (current + duration <= endMin) {
    const h = Math.floor(current / 60)
    const m = current % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    current += duration
  }
  return slots
}

const avatarColors = [
  'bg-cyan-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-blue-500'
]
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'

const formatSlot = (t) => {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`
}

const MOCK_SLOT_DATA = [
  { day: 'today', time: '10:00' },
  { day: 'today', time: '13:00' },
  { day: 'today', time: '11:30' },
  { day: 'today', time: '16:30' },
  { day: 'today', time: '09:30' },
  { day: 'tomorrow', time: '10:00' },
]

const mockSlot = (t, idx) => {
  const { day, time } = MOCK_SLOT_DATA[idx % MOCK_SLOT_DATA.length]
  const dayLabel = day === 'today' ? t('common.today') : t('common.tomorrow')
  return `${dayLabel}, ${formatSlot(time)}`
}

const mockFee = (idx) => [800, 700, 550, 900, 600, 750][idx % 6]
const mockRating = (idx) => [4.9, 4.8, 4.6, 4.9, 4.7, 4.5][idx % 6]

function BookingModal({ doctor, idx, onClose, onBooked }) {
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const today = new Date().toLocaleDateString('en-CA')
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [issue, setIssue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fee = doctor.consultation_fee || mockFee(idx)

  const ROW_HEIGHT = 40
  const GAP = 8
  const VISIBLE_ROWS = 4
  const slotGridMaxHeight = VISIBLE_ROWS * ROW_HEIGHT + (VISIBLE_ROWS - 1) * GAP

  useEffect(() => {
    if (date) {
      fetchSlots(date)
    } else {
      setAvailableSlots([])
      setBookedSlots([])
    }
  }, [date, doctor.id])

  const fetchSlots = async (selectedDate) => {
    setSlotsLoading(true)
    setSlot('')
    try {
      const [year, month, day] = selectedDate.split('-').map(Number)
      const dayName = DAYS[new Date(year, month - 1, day).getDay()]

      const { data: avail } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time, slot_duration')
        .eq('doctor_id', doctor.id)
        .eq('day_of_week', dayName)
        .eq('is_available', true)
        .single()

      if (!avail) {
        setAvailableSlots([])
        setBookedSlots([])
        setSlotsLoading(false)
        return
      }

      const rawSlots = generateSlots(
        avail.start_time.slice(0, 5),
        avail.end_time.slice(0, 5),
        avail.slot_duration || 15
      )

      if (selectedDate === today) {
        const now = new Date()
        setAvailableSlots(rawSlots.map(s => {
          const [h, m] = s.split(':').map(Number)
          const slotTime = new Date()
          slotTime.setHours(h, m, 0, 0)
          return { time: s, past: slotTime.getTime() <= now.getTime() }
        }))
      } else {
        setAvailableSlots(rawSlots.map(s => ({ time: s, past: false })))
      }

      const { data: existing } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctor.id)
        .eq('appointment_date', selectedDate)
        .in('status', ['pending', 'confirmed', 'accepted'])

      setBookedSlots(existing ? existing.map(a => a.appointment_time.slice(0, 5)) : [])
    } catch {
      setAvailableSlots([])
      setBookedSlots([])
    }
    setSlotsLoading(false)
  }

  const handleBook = async () => {
    if (!date || !slot) { setError(t('doctors.selectDateTimeError')); return }
    setLoading(true)
    setError('')
    try {
      const { error: bookError } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: doctor.id,
        appointment_date: date,
        appointment_time: slot,
        issue: issue || null,
        status: 'pending',
      })
      if (bookError) throw bookError
      onBooked(t('doctors.requestSent', { name: doctor.full_name }))
      onClose()
    } catch (err) {
      setError(err.message || t('doctors.bookFailError'))
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
              {getInitials(doctor.full_name)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 tracking-tight">Dr. {doctor.full_name}</h3>
              <p className="text-emerald-600 text-sm font-medium">{translateSpecialization(t, doctor.specialization)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <div className="bg-green-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600 font-medium">{t('home.consultationFee')}</span>
          <span className="text-xl font-bold text-emerald-700 tracking-tight">₹{fee}</span>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t('doctors.selectDate')}</label>
          <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-2 block">{t('doctors.selectTimeSlot')}</label>
          {!date ? (
            <p className="text-gray-400 text-xs">{t('doctors.selectDateFirst')}</p>
          ) : slotsLoading ? (
            <p className="text-gray-400 text-xs">{t('doctors.loadingSlots')}</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-red-400 text-xs">{t('doctors.noAvailability')}</p>
          ) : (
            <>
              <div className="overflow-y-auto pr-1" style={{ maxHeight: `${slotGridMaxHeight}px` }}>
                <div className="grid grid-cols-4 gap-2">
                  {availableSlots.map(({ time, past }) => {
                    const isBooked = bookedSlots.includes(time)
                    const isSelected = slot === time
                    const isDisabled = isBooked || past
                    return (
                      <button
                        key={time}
                        disabled={isDisabled}
                        onClick={() => !isDisabled && setSlot(time)}
                        className={`py-2 rounded-lg text-xs font-medium transition-all ${
                          isDisabled
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                            : 'bg-gray-50 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}>
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>
              {availableSlots.length > 16 && (
                <p className="text-xs text-gray-400 mt-1 text-center">{t('doctors.scrollMore')}</p>
              )}
            </>
          )}
        </div>

        <div className="mb-5">
          <label className="text-xs font-medium text-gray-500 mb-1 block">{t('doctors.describeIssue')}</label>
          <textarea value={issue} onChange={e => setIssue(e.target.value)}
            placeholder={t('home.issuePlaceholder')} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">
            {t('common.cancel')}
          </button>
          <button onClick={handleBook} disabled={loading || !slot}
            className="py-3 rounded-xl bg-emerald-700 text-white text-sm font-bold tracking-tight transition-colors hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? t('doctors.booking') : t('home.bookFee', { fee })}
          </button>
        </div>
      </div>
    </div>
  )
}

function DoctorCard({ doctor, idx, onBook, distanceMap }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/doctor/${doctor.id}`)}
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
            {getInitials(doctor.full_name)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm tracking-tight">Dr. {doctor.full_name}</h3>
            <p className="text-emerald-600 text-xs font-medium">{translateSpecialization(t, doctor.specialization)}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>{doctor.years_of_experience ? t('home.yrsExp', { years: doctor.years_of_experience }) : t('home.yrsExp', { years: 5 })}</span>
        <span>
          {distanceMap[doctor.id] != null
            ? <span className="text-emerald-700 font-medium">{Number(distanceMap[doctor.id]).toFixed(1)} km</span>
            : <span className="text-gray-300">— km</span>}
        </span>
        <span className="font-semibold text-gray-700">₹{doctor.consultation_fee ?? mockFee(idx)}</span>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onBook(doctor, idx) }}
          className="bg-emerald-700 text-white text-xs font-bold tracking-tight px-4 py-2 rounded-xl transition-colors hover:bg-emerald-500"
        >
          {t('home.bookNow')}
        </button>
      </div>
    </div>
  )
}

function Home() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [previousDoctors, setPreviousDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [success, setSuccess] = useState('')
  const [distanceMap, setDistanceMap] = useState({})
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetchDoctors()
    fetchPrevious()
  }, [])

  const handleLocationReady = useCallback(async (loc) => {
    if (!loc) return
    setNearbyLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch(
        `https://xfuzwuraowhaxqnfolzg.supabase.co/functions/v1/nearby-doctors?lat=${loc.lat}&lng=${loc.lng}&radius=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const map = {}
        data.forEach(d => { map[d.id] = d.distance_km })
        setDistanceMap(map)
        const sorted = [...data]
          .sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
          .slice(0, 4)
        setDoctors(sorted)
      }
    } catch {}
    setNearbyLoading(false)
  }, [])

  const fetchDoctors = async () => {
    setLoadingDoctors(true)
    const { data: profiles, error } = await supabase
      .from('doctor_profiles')
      .select('user_id, specialization, consultation_fee, years_of_experience, users!doctor_profiles_user_id_fkey(id, full_name, phone)')
      .limit(4)

    if (error || !profiles) {
      setDoctors([])
      setLoadingDoctors(false)
      return
    }

    const mapped = profiles.map(p => ({
      id: p.user_id,
      full_name: p.users?.full_name,
      phone: p.users?.phone,
      specialization: p.specialization,
      consultation_fee: p.consultation_fee,
      years_of_experience: p.years_of_experience,
    }))
    setDoctors(mapped)
    setLoadingDoctors(false)
  }

  const fetchPrevious = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, doctor_id, appointment_date, appointment_time, users!appointments_doctor_id_fkey(full_name)')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false })
    if (error || !data) return

    const seen = new Set()
    const prev = []
    for (const appt of data) {
      if (!seen.has(appt.doctor_id)) {
        seen.add(appt.doctor_id)
        prev.push({ ...appt, doctor_name: appt.users?.full_name })
      }
    }
    const trimmed = prev.slice(0, 2)

    const doctorIds = trimmed.map(a => a.doctor_id).filter(Boolean)
    let specializationById = {}
    if (doctorIds.length > 0) {
      const { data: dp } = await supabase
        .from('doctor_profiles')
        .select('user_id, specialization')
        .in('user_id', doctorIds)
      specializationById = Object.fromEntries((dp || []).map(p => [p.user_id, p.specialization]))
    }

    setPreviousDoctors(trimmed.map(a => ({ ...a, specialization: specializationById[a.doctor_id] })))
  }

  useEffect(() => {
    const usersChannel = supabase
      .channel('home-doctor-profiles')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'users',
      }, (payload) => {
        setDoctors(prev => prev.map(d =>
          d.id === payload.new.id ? { ...d, full_name: payload.new.full_name, phone: payload.new.phone } : d
        ))
        setSelectedDoctor(prev => (prev && prev.id === payload.new.id) ? { ...prev, full_name: payload.new.full_name, phone: payload.new.phone } : prev)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(usersChannel)
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${query}`)
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return t('home.goodMorning')
    if (h < 17) return t('home.goodAfternoon')
    return t('home.goodEvening')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-3xl mb-6">
            <p className="text-cyan-100 text-sm font-medium mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white mb-5">
              {t('home.greeting', { name: user.full_name?.split(' ')[0] })}
            </h1>

            <LocationBar onLocationReady={handleLocationReady} />

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mt-4">
              <div className="flex items-center bg-white/20 backdrop-blur-sm border border-white rounded-2xl px-4 py-3 gap-3 max-w-2xl transition-colors hover:bg-white/30">
                <svg className="w-5 h-5 text-white/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth={2} />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth={2} strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Find doctors / track appointments / view prescriptions"
                  className="flex-1 text-sm text-white placeholder-white/60 focus:outline-none bg-transparent"
                />
              </div>
            </form>
          </div>

          {/* ── Page content ── */}
          <div className="flex-1 px-4 sm:px-8 pb-8 max-w-5xl w-full">

            {success && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 max-w-2xl">
                ⏳ {success}
                <button onClick={() => navigate('/my-appointments')} className="ml-auto text-amber-600 underline font-medium">
                  {t('home.viewAppointments')}
                </button>
              </div>
            )}

            {/* Nearby Doctors */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-gray-900 flex items-center gap-2">
                    📍 {t('home.nearbyDoctors')}
                    {nearbyLoading && (
                      <span className="text-xs font-normal text-emerald-500 animate-pulse ml-1">
                        {t('home.sortingByDistance')}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {Object.keys(distanceMap).length > 0 ? t('home.sortedByDistance') : t('home.enableLocation')}
                  </p>
                </div>
                <button onClick={() => navigate('/doctors')} className="text-emerald-600 text-sm font-medium hover:underline hover:text-emerald-500">
                  {t('home.seeAll')}
                </button>
              </div>

              {loadingDoctors ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 h-32 animate-pulse" />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                  {t('home.noDoctorsFound')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctors.map((doc, idx) => (
                    <DoctorCard key={doc.id} doctor={doc} idx={idx}
                      onBook={(d, i) => { setSelectedDoctor(d); setSelectedIdx(i) }}
                      distanceMap={distanceMap} />
                  ))}
                </div>
              )}
            </div>

            {/* Previously Visited */}
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold tracking-tight text-gray-900">🔄 {t('home.previouslyVisited')}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{t('home.quickRebook')}</p>
              </div>
              {previousDoctors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <p className="text-gray-400 text-sm">{t('home.noPreviousDoctors')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {previousDoctors.map((appt, idx) => (
                    <div key={appt.id}
                      onClick={() => navigate(`/doctor/${appt.doctor_id}`)}
                      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                          {getInitials(appt.doctor_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-900 tracking-tight">Dr. {appt.doctor_name}</p>
                          <p className="text-emerald-600 text-xs font-medium">{translateSpecialization(t, appt.specialization)}</p>
                        </div>
                      </div>
                      <button onClick={(e) => {
                          e.stopPropagation()
                          setSelectedDoctor({
                            id: appt.doctor_id,
                            full_name: appt.doctor_name,
                            specialization: appt.specialization,
                          })
                          setSelectedIdx(idx)
                        }}
                        className="text-emerald-700 text-xs font-bold tracking-tight bg-green-50 px-3 py-1.5 rounded-lg transition-colors hover:bg-green-100 hover:text-emerald-600">
                        {t('home.rebook')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {selectedDoctor && (
            <BookingModal
              doctor={selectedDoctor}
              idx={selectedIdx}
              onClose={() => setSelectedDoctor(null)}
              onBooked={(msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }}
            />
          )}

        </div>
      </div>
    </SidebarProvider>
  )
}

export default Home