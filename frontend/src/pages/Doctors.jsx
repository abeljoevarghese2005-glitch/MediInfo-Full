import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import LocationBar from '../components/LocationBar'
import { supabase } from '../lib/supabase'
import { translateSpecialization } from '../utils/specializations'

// Used for the filter chips, which need the "All" option in addition to
// the real specializations. The translation lookup itself now comes from
// the shared src/utils/specializations.js helper (single source of truth),
// so this array is only used here for rendering the chips and as the
// filter state values — not for translating doctor.specialization.
const SPECIALIZATIONS = [
  { value: 'All', key: 'all' },
  { value: 'General Physician', key: 'generalPhysician' },
  { value: 'Cardiologist', key: 'cardiologist' },
  { value: 'Dermatologist', key: 'dermatologist' },
  { value: 'Neurologist', key: 'neurologist' },
  { value: 'Orthopedic', key: 'orthopedic' },
  { value: 'Pediatrician', key: 'pediatrician' },
  { value: 'Psychiatrist', key: 'psychiatrist' },
  { value: 'ENT', key: 'ent' },
]

const avatarColors = ['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'D'

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

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function Doctors() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [userLocation, setUserLocation] = useState(null)

  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [issue, setIssue] = useState('')
  const [paying, setPaying] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  const today = new Date().toLocaleDateString('en-CA')

  const locationRef = useRef(userLocation)
  useEffect(() => { locationRef.current = userLocation }, [userLocation])

  // ✅ Keep a ref to the currently selected doctor/date so realtime callbacks always see latest values
  const selectedDoctorRef = useRef(selectedDoctor)
  const selectedDateRef = useRef(selectedDate)
  useEffect(() => { selectedDoctorRef.current = selectedDoctor }, [selectedDoctor])
  useEffect(() => { selectedDateRef.current = selectedDate }, [selectedDate])

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchSlots(selectedDoctor, selectedDate)
    } else {
      setAvailableSlots([])
      setBookedSlots([])
    }
  }, [selectedDoctor, selectedDate])

  const fetchSlots = async (doctor, date) => {
    setSlotsLoading(true)
    try {
      const [year, month, day] = date.split('-').map(Number)
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

      if (date === today) {
        const now = new Date()
        const bufferMs = 0
        setAvailableSlots(rawSlots.map(slot => {
          const [h, m] = slot.split(':').map(Number)
          const slotTime = new Date()
          slotTime.setHours(h, m, 0, 0)
          return { time: slot, past: slotTime.getTime() <= now.getTime() + bufferMs }
        }))
      } else {
        setAvailableSlots(rawSlots.map(slot => ({ time: slot, past: false })))
      }

      const { data: existing } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('doctor_id', doctor.id)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed', 'accepted'])

      setBookedSlots(existing ? existing.map(a => a.appointment_time.slice(0, 5)) : [])
    } catch {
      setAvailableSlots([])
      setBookedSlots([])
    }
    setSlotsLoading(false)
  }

  const fetchDoctors = useCallback(async (loc, spec) => {
    setLoading(true)
    try {
      if (loc) {
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || ''
        const specParam = spec && spec !== 'All' ? `&specialization=${encodeURIComponent(spec)}` : ''
        const res = await fetch(
          `https://xfuzwuraowhaxqnfolzg.supabase.co/functions/v1/nearby-doctors?lat=${loc.lat}&lng=${loc.lng}&radius=100${specParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error('Edge function error')
        const data = await res.json()
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
          setDoctors(sorted)
        } else {
          setDoctors([])
        }
      } else {
        let query = supabase
          .from('users')
          .select('id, full_name, specialization, years_of_experience, consultation_fee, phone, latitude, longitude')
          .eq('role', 'doctor')
        if (spec && spec !== 'All') query = query.eq('specialization', spec)
        const { data, error: dbErr } = await query
        setDoctors(dbErr ? [] : (data || []))
      }
    } catch {
      let query = supabase
        .from('users')
        .select('id, full_name, specialization, years_of_experience, consultation_fee, phone, latitude, longitude')
        .eq('role', 'doctor')
      if (spec && spec !== 'All') query = query.eq('specialization', spec)
      const { data } = await query
      if (data) {
        const loc = locationRef.current
        if (loc) {
          const withDistance = data.map(d => ({
            ...d,
            distance_km: d.latitude && d.longitude
              ? getDistanceKm(loc.lat, loc.lng, d.latitude, d.longitude)
              : null
          }))
          withDistance.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
          setDoctors(withDistance)
        } else {
          setDoctors(data)
        }
      } else {
        setDoctors([])
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDoctors(locationRef.current, filter)
  }, [filter, fetchDoctors])

  const handleLocationReady = useCallback((loc) => {
    setUserLocation(loc)
    fetchDoctors(loc, filter)
  }, [filter, fetchDoctors])

  // ✅ NEW: Realtime subscriptions — instant sync when doctors update profile or availability
  useEffect(() => {
    const availabilityChannel = supabase
      .channel('patient-doctor-availability')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'doctor_availability',
      }, (payload) => {
        // If the patient currently has a booking modal open for this doctor, re-fetch slots instantly
        const doc = selectedDoctorRef.current
        const date = selectedDateRef.current
        const changedDoctorId = payload.new?.doctor_id || payload.old?.doctor_id
        if (doc && date && doc.id === changedDoctorId) {
          fetchSlots(doc, date)
        }
      })
      .subscribe()

    const usersChannel = supabase
      .channel('patient-doctor-profiles')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'users',
        filter: `role=eq.doctor`,
      }, (payload) => {
        // Update fee/experience/name instantly in the doctors list without a full refetch
        setDoctors(prev => prev.map(d =>
          d.id === payload.new.id
            ? { ...d, ...payload.new, distance_km: d.distance_km } // preserve distance_km, it's not in users table
            : d
        ))
        // Also update the selected doctor in the open modal, if relevant
        setSelectedDoctor(prev => (prev && prev.id === payload.new.id) ? { ...prev, ...payload.new, distance_km: prev.distance_km } : prev)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(availabilityChannel)
      supabase.removeChannel(usersChannel)
    }
  }, [])

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) { setError(t('doctors.selectDateTimeError')); return }
    if (bookedSlots.includes(selectedTime)) { setError(t('doctors.slotBookedError')); return }
    setPaying(true)
    setError('')
    try {
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', selectedDoctor.id)
        .eq('patient_id', user.id)
        .eq('appointment_date', selectedDate)
        .eq('appointment_time', selectedTime)
        .in('status', ['pending', 'confirmed', 'accepted'])

      if (existing && existing.length > 0) {
        setError(t('doctors.duplicateApptError'))
        setPaying(false)
        return
      }

      const { error: bookError } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        issue: issue || null,
        status: 'pending',
      })
      if (bookError) throw bookError
      setSuccess(t('doctors.requestSent', { name: selectedDoctor.full_name }))
      setSelectedDoctor(null)
      setSelectedDate('')
      setSelectedTime('')
      setIssue('')
      setTimeout(() => setSuccess(''), 6000)
    } catch (err) {
      setError(err.message || t('doctors.bookFailError'))
    }
    setPaying(false)
  }

  const ROW_HEIGHT = 40
  const GAP = 8
  const VISIBLE_ROWS = 4
  const slotGridMaxHeight = VISIBLE_ROWS * ROW_HEIGHT + (VISIBLE_ROWS - 1) * GAP

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-3xl mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{t('doctors.title')}</h1>
            <p className="text-cyan-100 text-sm mt-1">{t('doctors.subtitle')}</p>
          </div>

          <div className="flex-1 px-4 sm:px-8 py-6 max-w-5xl w-full">

            <LocationBar onLocationReady={handleLocationReady} />

            {success && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                ⏳ {success}
                <button onClick={() => navigate('/my-appointments')} className="ml-auto text-amber-600 underline font-medium">
                  {t('doctors.viewAppointments')}
                </button>
              </div>
            )}

            {/* ── Specialization Filter Chips ── */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {SPECIALIZATIONS.map(({ value, key }) => (
                <button key={value} onClick={() => setFilter(value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    filter === value
                      ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}>
                  {t(`doctors.specializations.${key}`)}
                </button>
              ))}
            </div>

            {/* ── Doctor List ── */}
            {loading ? (
              <div className="text-center py-16 text-gray-400">{t('doctors.loadingDoctors')}</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🩺</p>
                <p className="text-gray-500">{t('doctors.noDoctors')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('doctors.noDoctorsSub')}</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl">
                {userLocation && (
                  <p className="text-xs text-gray-400 mb-1">{t('doctors.sortedByDistance')}</p>
                )}
                {doctors.map(doctor => (
                  <div key={doctor.id} className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white text-xl font-semibold shrink-0`}>
                        {getInitials(doctor.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 tracking-tight">Dr. {doctor.full_name}</h3>
                        <p className="text-emerald-600 text-sm font-medium">{translateSpecialization(t, doctor.specialization)}</p>
                        <p className="text-gray-400 text-xs mt-0.5">📞 {doctor.phone}</p>
                        {doctor.distance_km != null && (
                          <p className="text-emerald-600 text-xs font-medium mt-0.5">
                            📍 {t('doctors.distanceAway', { distance: Number(doctor.distance_km).toFixed(1) })}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-emerald-700 font-bold text-sm tracking-tight">₹{doctor.consultation_fee || 500}</p>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doctor)
                            setError('')
                            setSelectedDate('')
                            setSelectedTime('')
                            setIssue('')
                          }}
                          className="mt-1 bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold tracking-tight transition-colors hover:bg-emerald-500">
                          {t('doctors.book')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Booking Modal ── */}
      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold tracking-tight text-gray-800 text-lg">{t('doctors.bookAppointment')}</h2>
              <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3 mb-4">
              <div className={`w-10 h-10 ${getColor(selectedDoctor.full_name)} rounded-full flex items-center justify-center text-white font-semibold shrink-0`}>
                {getInitials(selectedDoctor.full_name)}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 tracking-tight">Dr. {selectedDoctor.full_name}</p>
                <p className="text-emerald-600 text-sm font-medium">{translateSpecialization(t, selectedDoctor.specialization)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">{t('doctors.fee')}</p>
                <p className="font-bold text-emerald-700 tracking-tight">₹{selectedDoctor.consultation_fee || 500}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('doctors.selectDate')}</label>
              <input type="date" min={today} value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
            </div>

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-2 block">{t('doctors.selectTimeSlot')}</label>
              {!selectedDate ? (
                <p className="text-gray-400 text-xs">{t('doctors.selectDateFirst')}</p>
              ) : slotsLoading ? (
                <p className="text-gray-400 text-xs">{t('doctors.loadingSlots')}</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-red-400 text-xs">{t('doctors.noAvailability')}</p>
              ) : (
                <>
                  <div
                    className="overflow-y-auto pr-1"
                    style={{ maxHeight: `${slotGridMaxHeight}px` }}
                  >
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(({ time, past }) => {
                        const isBooked = bookedSlots.includes(time)
                        const isSelected = selectedTime === time
                        const isDisabled = isBooked || past
                        return (
                          <button
                            key={time}
                            disabled={isDisabled}
                            onClick={() => !isDisabled && setSelectedTime(time)}
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

            <div className="mb-4">
              <label className="text-xs font-medium text-gray-500 mb-1 block">{t('doctors.describeIssue')}</label>
              <textarea value={issue} onChange={e => setIssue(e.target.value)}
                placeholder={t('doctors.issuePlaceholder')} rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
            </div>

            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">❌ {error}</div>}

            <button onClick={handleBook} disabled={paying || !selectedTime}
              className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold tracking-tight transition-colors hover:bg-emerald-500 disabled:opacity-60 flex items-center justify-center gap-2">
              {paying ? t('doctors.booking') : t('doctors.requestAppointment', { fee: selectedDoctor.consultation_fee ?? 500 })}
            </button>
          </div>
        </div>
      )}

    </SidebarProvider>
  )
}

export default Doctors