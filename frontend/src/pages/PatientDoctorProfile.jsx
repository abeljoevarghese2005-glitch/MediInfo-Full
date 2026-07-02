import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'
import { translateSpecialization } from '../utils/specializations'
import { useTranslation } from 'react-i18next'

const avatarColors = ['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'D'

const GRADIENT_BG = 'bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400'
const GRADIENT_BTN = 'bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500 hover:opacity-90 text-white'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const MODE_META = {
  in_clinic: { label: 'In-clinic', icon: '🏥' },
  video: { label: 'Video', icon: '🎥' },
  home_visit: { label: 'Home visit', icon: '🏠' },
}

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

function StarRating({ value, onChange, size = 'md' }) {
  const sz = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange && onChange(star)}
          className={`${sz} transition-colors ${star <= value ? 'text-amber-400' : 'text-gray-200'}`}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function ReviewBar({ label, pct }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-3 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-7 text-right shrink-0">{pct}%</span>
    </div>
  )
}

function PatientDoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Availability
  const [availableToday, setAvailableToday] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [slots, setSlots] = useState([])
  const [bookedSlots, setBookedSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)

  // Consultation mode — real, doctor-set (in_clinic / video / home_visit)
  const [consultationType, setConsultationType] = useState('in_clinic')

  // Stats
  const [stats, setStats] = useState({ patients: 0, avgWait: 0, rating: 0, reviews: 0 })
  const [ratingBreakdown, setRatingBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })

  // Reviews
  const [reviews, setReviews] = useState([])
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [myRating, setMyRating] = useState(0)
  const [myReview, setMyReview] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [reviewError, setReviewError] = useState('')

  // Booking
  const [issue, setIssue] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookSuccess, setBookSuccess] = useState('')
  const [bookError, setBookError] = useState('')

  // Next 7 days for day picker
  const today = new Date()
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return {
      date: d.toLocaleDateString('en-CA'),
      dayShort: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
    }
  })

  useEffect(() => {
    fetchDoctor()
  }, [id])

  useEffect(() => {
    if (selectedDate && doctor) fetchSlots(selectedDate)
    else { setSlots([]); setBookedSlots([]) }
  }, [selectedDate, doctor])

  // Set default consultation mode once doctor data is loaded — based on what doctor actually offers
  useEffect(() => {
    if (doctor) {
      const modes = getAvailableModes(doctor)
      if (modes.length > 0 && !modes.includes(consultationType)) {
        setConsultationType(modes[0])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor])

  const getAvailableModes = (d) => {
    const modes = []
    if (d?.offers_in_clinic !== false) modes.push('in_clinic')
    if (d?.offers_video) modes.push('video')
    if (d?.offers_home_visit) modes.push('home_visit')
    return modes
  }

  const fetchDoctor = async () => {
    setLoading(true)
    try {
      const { data, error: dbErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .eq('role', 'doctor')
        .single()
      if (dbErr) throw dbErr
      setDoctor(data)

      // Check available today
      const todayName = DAYS[new Date().getDay()]
      const { data: todayAvail } = await supabase
        .from('doctor_availability')
        .select('id')
        .eq('doctor_id', id)
        .eq('day_of_week', todayName)
        .eq('is_available', true)
        .single()
      setAvailableToday(!!todayAvail)

      // Stats
      const [{ count: patientCount }, { data: reviewData }, { data: apptData }] = await Promise.all([
        supabase.from('appointments').select('patient_id', { count: 'exact', head: true }).eq('doctor_id', id),
        supabase.from('reviews').select('rating, review_text, created_at, patient_id').eq('doctor_id', id).order('created_at', { ascending: false }),
        supabase.from('appointments').select('duration_minutes').eq('doctor_id', id).eq('status', 'completed'),
      ])

      const totalReviews = reviewData?.length || 0
      const avgRating = totalReviews ? (reviewData.reduce((s, r) => s + r.rating, 0) / totalReviews) : 0
      const avgWait = apptData?.length
        ? Math.round(apptData.reduce((s, a) => s + (a.duration_minutes || data.time_per_patient || 15), 0) / apptData.length)
        : (data.time_per_patient || 15)

      setStats({ patients: patientCount || 0, avgWait, rating: avgRating.toFixed(1), reviews: totalReviews })

      // Rating breakdown
      const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      reviewData?.forEach(r => { if (breakdown[r.rating] !== undefined) breakdown[r.rating]++ })
      const pcts = {}
      Object.keys(breakdown).forEach(k => {
        pcts[k] = totalReviews ? Math.round((breakdown[k] / totalReviews) * 100) : 0
      })
      setRatingBreakdown(pcts)

      // Fetch patient names for reviews
      if (reviewData?.length) {
        const patientIds = [...new Set(reviewData.map(r => r.patient_id))]
        const { data: patients } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', patientIds)
        const nameMap = Object.fromEntries((patients || []).map(p => [p.id, p.full_name]))
        setReviews(reviewData.map(r => ({ ...r, patient_name: nameMap[r.patient_id] || 'Patient' })))
      } else {
        setReviews([])
      }

    } catch { setError('Failed to load doctor profile.') }
    setLoading(false)
  }

  const fetchSlots = async (date) => {
    setSlotsLoading(true)
    setSelectedTime('')
    try {
      const [year, month, day] = date.split('-').map(Number)
      const dayName = DAYS[new Date(year, month - 1, day).getDay()]

      const { data: avail } = await supabase
        .from('doctor_availability')
        .select('start_time, end_time, slot_duration')
        .eq('doctor_id', id)
        .eq('day_of_week', dayName)
        .eq('is_available', true)
        .single()

      if (!avail) { setSlots([]); setSlotsLoading(false); return }

      const raw = generateSlots(avail.start_time.slice(0, 5), avail.end_time.slice(0, 5), avail.slot_duration || 15)
      const todayStr = new Date().toLocaleDateString('en-CA')
      const now = new Date()

      const withPast = raw.map(slot => {
        if (date === todayStr) {
          const [h, m] = slot.split(':').map(Number)
          const slotTime = new Date(); slotTime.setHours(h, m, 0, 0)
          return { time: slot, past: slotTime <= now }
        }
        return { time: slot, past: false }
      })
      setSlots(withPast)

      const { data: existing, error: slotErr } = await supabase.rpc('get_booked_slots', {
        p_doctor_id: id,
        p_date: date,
      })
      if (slotErr) throw slotErr
      setBookedSlots(existing ? existing.map(a => a.appointment_time.slice(0, 5)) : [])
    } catch { setSlots([]); setBookedSlots([]) }
    setSlotsLoading(false)
  }

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) { setBookError('Please select a date and time.'); return }
    setBooking(true)
    setBookError('')
    try {
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', id)
        .eq('patient_id', user.id)
        .eq('appointment_date', selectedDate)
        .eq('appointment_time', selectedTime)
        .in('status', ['pending', 'confirmed', 'accepted'])
      if (existing?.length) { setBookError('You already have an appointment at this time.'); setBooking(false); return }

      const { error: bookErr } = await supabase.from('appointments').insert({
        patient_id: user.id,
        doctor_id: id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        issue: issue || null,
        status: 'pending',
        consultation_type: consultationType,
      })
      if (bookErr) throw bookErr
      setBookSuccess(`Appointment request sent to Dr. ${doctor.full_name}!`)
      setSelectedDate('')
      setSelectedTime('')
      setIssue('')
      setTimeout(() => setBookSuccess(''), 5000)
    } catch (e) { setBookError(e.message || 'Booking failed. Please try again.') }
    setBooking(false)
  }

  const handleSubmitReview = async () => {
    if (!myRating) { setReviewError('Please select a star rating.'); return }
    setSubmittingReview(true)
    setReviewError('')
    try {
      const { error: revErr } = await supabase.from('reviews').insert({
        doctor_id: id,
        patient_id: user.id,
        rating: myRating,
        review_text: myReview || null,
      })
      if (revErr) throw revErr
      setReviewSuccess(true)
      setMyRating(0)
      setMyReview('')
      setTimeout(() => setReviewSuccess(false), 4000)
      fetchDoctor()
    } catch (e) { setReviewError(e.message || 'Failed to submit review.') }
    setSubmittingReview(false)
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  const qualifications = Array.isArray(doctor?.qualifications)
    ? doctor.qualifications
    : (doctor?.qualifications ? (() => { try { return JSON.parse(doctor.qualifications) } catch { return [] } })() : [])

  const availableModes = doctor ? getAvailableModes(doctor) : []

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days < 1) return 'Today'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    if (days < 365) return `${Math.floor(days / 30)}mo ago`
    return `${Math.floor(days / 365)}y ago`
  }

  if (loading) return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <TopBar />
          <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">Loading…</div>
        </div>
      </div>
    </SidebarProvider>
  )

  if (error || !doctor) return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <TopBar />
          <div className="flex items-center justify-center flex-1 flex-col gap-3">
            <p className="text-gray-500">{error || 'Doctor not found.'}</p>
            <button onClick={() => navigate('/doctors')} className="text-cyan-600 underline text-sm">Back to doctors</button>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex overflow-x-hidden">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <TopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 max-w-2xl w-full min-w-0 mx-auto pb-24 overflow-x-hidden">

            {/* Back button */}
            <button onClick={() => navigate('/doctors')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 py-2">
              ← Back to doctors
            </button>

            {/* Header card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 ${GRADIENT_BG} rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0`}>
                  {getInitials(doctor.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-black text-gray-900">Dr. {doctor.full_name}</h1>
                    <span className="flex items-center gap-1 bg-cyan-50 text-teal-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-cyan-100">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Verified
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {doctor.specialization}
                    {qualifications.length > 0 && ` · ${qualifications.map(q => q.degree).join(', ')}`}
                    {doctor.experience_years > 0 && ` · ${doctor.experience_years} yrs experience`}
                  </p>
                  {doctor.clinic_name && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      🏥 {doctor.clinic_name}
                    </p>
                  )}
                  {doctor.city && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      📍 {doctor.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Info pills */}
              <div className="flex flex-wrap gap-2 mt-4">
                {stats.rating > 0 && (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-100">
                    ⭐ {stats.rating} · {stats.reviews} reviews
                  </span>
                )}
                <span className="flex items-center gap-1 bg-cyan-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-cyan-100">
                  ⏱ ~{stats.avgWait} min wait
                </span>
                <span className="flex items-center gap-1 bg-cyan-50 text-teal-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-cyan-100">
                  ₹ ₹{doctor.consultation_fee || 500} fee
                </span>
                {availableToday && (
                  <span className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-100">
                    ✅ Available today
                  </span>
                )}
              </div>
            </div>

            {/* Book Appointment */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Book Appointment</p>
              <p className="text-2xl font-black text-gray-900 mb-4">
                ₹{doctor.consultation_fee || 500} <span className="text-sm font-normal text-gray-400">consultation</span>
              </p>

              {bookSuccess && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center justify-between gap-2">
                  <span>⏳ {bookSuccess}</span>
                  <button onClick={() => navigate('/my-appointments')} className="text-amber-600 underline font-medium text-xs shrink-0">View</button>
                </div>
              )}

              {/* Consultation mode — only shown if doctor actually offers it, real data only */}
              {availableModes.length > 1 && (
                <div className="flex bg-gray-50 rounded-xl p-1 mb-4 border border-gray-100">
                  {availableModes.map(mode => (
                    <button key={mode} onClick={() => setConsultationType(mode)}
                      className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all truncate ${
                      consultationType === mode ? `${GRADIENT_BTN} shadow-sm` : 'text-gray-500'
                    }`}>
                      <span className="truncate">{MODE_META[mode].icon} {MODE_META[mode].label}</span>
                    </button>
                  ))}
                </div>
              )}
              {availableModes.length === 1 && (
                <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
                  {MODE_META[availableModes[0]].icon} {MODE_META[availableModes[0]].label} consultation only
                </p>
              )}

              {/* Day picker */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {dateOptions.map(({ date, dayShort, dayNum }) => (
                  <button key={date} onClick={() => setSelectedDate(date)}
                    className={`flex flex-col items-center px-3 py-2.5 rounded-xl shrink-0 min-w-[52px] transition-all ${
                      selectedDate === date
                        ? `${GRADIENT_BTN} shadow-sm`
                        : 'bg-gray-50 text-gray-600 border border-gray-100 hover:border-cyan-300'
                    }`}>
                    <span className="text-xs font-medium">{dayShort}</span>
                    <span className="text-base font-black">{dayNum}</span>
                  </button>
                ))}
              </div>

              {/* Time slots */}
              {!selectedDate ? (
                <p className="text-sm text-gray-400 mb-4">Select a date to see available slots.</p>
              ) : slotsLoading ? (
                <p className="text-sm text-gray-400 mb-4">Loading slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-red-400 mb-4">No availability on this day.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {slots.map(({ time, past }) => {
                    const isBooked = bookedSlots.includes(time)
                    const isSelected = selectedTime === time
                    const isDisabled = isBooked || past
                    return (
                      <button key={time} disabled={isDisabled} onClick={() => !isDisabled && setSelectedTime(time)}
                        className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                          isDisabled
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                            : isSelected
                            ? `${GRADIENT_BTN} shadow-sm`
                            : 'bg-gray-50 text-gray-700 border border-gray-100 hover:border-cyan-400 active:bg-cyan-50'
                        }`}>
                        {time}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Issue */}
              <textarea value={issue} onChange={e => setIssue(e.target.value)}
                placeholder="Describe your issue (optional)"
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-3" />

              {bookError && <p className="text-red-500 text-sm mb-3">❌ {bookError}</p>}

              <button onClick={handleBook} disabled={booking || !selectedTime}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
                  selectedTime
                    ? `${GRADIENT_BTN}`
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } disabled:opacity-60`}>
                {booking ? 'Booking…' : selectedTime ? `Book for ${selectedTime}` : 'Select a time slot'}
              </button>

              <p className="text-xs text-gray-400 text-center mt-2">🛡 Free cancellation up to 2 hours before your appointment.</p>
            </div>

            {/* About */}
            {(doctor.bio || doctor.description) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h2 className="text-base font-black text-gray-900 mb-3">About Dr. {doctor.full_name}</h2>
                {doctor.description && <p className="text-sm text-gray-500 italic mb-2">{doctor.description}</p>}
                {doctor.bio && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{doctor.bio}</p>}
              </div>
            )}

            {/* Services */}
            {doctor.services?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h2 className="text-base font-black text-gray-900 mb-3">Services</h2>
                <div className="flex flex-wrap gap-2">
                  {doctor.services.map(s => (
                    <span key={s} className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-100 text-teal-700 text-sm font-medium px-3 py-1.5 rounded-full">
                      <svg className="w-3.5 h-3.5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Qualifications */}
            {qualifications.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h2 className="text-base font-black text-gray-900 mb-3">Qualifications</h2>
                <div className="space-y-3">
                  {qualifications.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`w-9 h-9 ${GRADIENT_BG} rounded-full flex items-center justify-center shrink-0`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5 12.083 12.083 0 015.84 10.578L12 14z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{q.degree}</p>
                        <p className="text-xs text-gray-500">{q.institution}{q.year && ` · ${q.year}`}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awards */}
            {doctor.awards?.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
                <h2 className="text-base font-black text-gray-900 mb-3">Awards & recognition</h2>
                <div className="space-y-2">
                  {doctor.awards.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-teal-500 text-base shrink-0">🏆</span>
                      <span className="text-sm text-gray-700">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patient Reviews */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h2 className="text-base font-black text-gray-900 mb-4">Patient reviews</h2>

              {reviews.length > 0 ? (
                <>
                  {/* Rating summary */}
                  <div className="flex gap-4 mb-5">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="text-4xl font-black text-gray-900">{stats.rating}</span>
                      <StarRating value={Math.round(stats.rating)} />
                      <span className="text-xs text-gray-400 mt-1">{stats.reviews} reviews</span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map(n => (
                        <ReviewBar key={n} label={n} pct={ratingBreakdown[n] || 0} />
                      ))}
                    </div>
                  </div>

                  {/* Review list */}
                  <div className="space-y-4 mb-4">
                    {displayedReviews.map((r, idx) => (
                      <div key={idx} className="border-t border-gray-50 pt-4 first:border-0 first:pt-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 ${getColor(r.patient_name)} rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                              {getInitials(r.patient_name)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{r.patient_name}</p>
                              <StarRating value={r.rating} />
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{timeAgo(r.created_at)}</span>
                        </div>
                        {r.review_text && <p className="text-sm text-gray-600 mt-2 ml-10">{r.review_text}</p>}
                      </div>
                    ))}
                  </div>

                  {reviews.length > 3 && (
                    <button onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                      💬 {showAllReviews ? 'Show less' : `See all ${reviews.length} reviews`}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 mb-4">No reviews yet. Be the first to review!</p>
              )}

              {/* Submit review */}
              <div className="mt-5 border-t border-gray-100 pt-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Leave a review</h3>
                {reviewSuccess ? (
                  <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl text-sm">✅ Review submitted. Thank you!</div>
                ) : (
                  <>
                    <div className="mb-3">
                      <StarRating value={myRating} onChange={setMyRating} size="lg" />
                    </div>
                    <textarea value={myReview} onChange={e => setMyReview(e.target.value)}
                      placeholder="Share your experience (optional)"
                      rows={3}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400 mb-3" />
                    {reviewError && <p className="text-red-500 text-sm mb-2">{reviewError}</p>}
                    <button onClick={handleSubmitReview} disabled={submittingReview || !myRating}
                      className={`w-full py-3 ${GRADIENT_BTN} rounded-xl font-bold text-sm disabled:opacity-50 transition-colors`}>
                      {submittingReview ? 'Submitting…' : 'Submit review'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Clinic & Contact */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h2 className="text-base font-black text-gray-900 mb-4">Clinic & contact</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🏥', label: 'Clinic', value: doctor.clinic_name },
                  { icon: '📍', label: 'Address', value: doctor.city },
                  { icon: '📞', label: 'Phone', value: doctor.phone },
                  { icon: '✉️', label: 'Email', value: doctor.email },
                  { icon: '🩺', label: 'Specialization', value: doctor.specialization },
                  { icon: '🔒', label: 'License', value: doctor.license_number },
                ].filter(item => item.value).map(({ icon, label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-gray-800 flex items-center gap-1">{icon} {value}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default PatientDoctorProfile