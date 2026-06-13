import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import LocationBar from '../components/LocationBar'
import { supabase } from '../lib/supabase'

const SPECIALIZATIONS = [
  'All', 'General Physician', 'Cardiologist', 'Dermatologist',
  'Neurologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist', 'ENT'
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

function Doctors() {
  const navigate = useNavigate()
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

  const today = new Date().toISOString().split('T')[0]

  // Keep a ref so fetchDoctors can always see the latest location
  // without needing it as a dependency that causes infinite loops
  const locationRef = useRef(userLocation)
  useEffect(() => { locationRef.current = userLocation }, [userLocation])

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
      const dayName = DAYS[new Date(date).getDay()]

      // fetch doctor availability for this day
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

      const slots = generateSlots(
        avail.start_time.slice(0, 5),
        avail.end_time.slice(0, 5),
        avail.slot_duration || 15
      )
      setAvailableSlots(slots)

      // fetch already booked slots for this doctor + date
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

  // Single fetch function — uses nearby-doctors Edge Function when location is available,
  // falls back to direct Supabase query when not
  const fetchDoctors = useCallback(async (loc, spec) => {
    setLoading(true)
    try {
      if (loc) {
        // Fetch from Edge Function — returns doctors sorted by distance
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token || ''
        const specParam = spec && spec !== 'All' ? `&specialization=${encodeURIComponent(spec)}` : ''
        const res = await fetch(
          `https://xfuzwuraowhaxqnfolzg.supabase.co/functions/v1/nearby-doctors?lat=${loc.lat}&lng=${loc.lng}&radius=100${specParam}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error('Edge function error')
        const data = await res.json()
        setDoctors(Array.isArray(data) ? data : [])
      } else {
        // No location — fall back to direct Supabase query, no distance info
        let query = supabase
          .from('users')
          .select('id, full_name, specialization, years_of_experience, consultation_fee, phone')
          .eq('role', 'doctor')
        if (spec && spec !== 'All') query = query.eq('specialization', spec)
        const { data, error: dbErr } = await query
        setDoctors(dbErr ? [] : (data || []))
      }
    } catch {
      // On any error fall back to direct query
      let query = supabase
        .from('users')
        .select('id, full_name, specialization, years_of_experience, consultation_fee, phone')
        .eq('role', 'doctor')
      if (spec && spec !== 'All') query = query.eq('specialization', spec)
      const { data } = await query
      setDoctors(data || [])
    }
    setLoading(false)
  }, [])

  // Re-fetch when filter changes, using whatever location we currently have
  useEffect(() => {
    fetchDoctors(locationRef.current, filter)
  }, [filter, fetchDoctors])

  // Called by LocationBar when location is detected or set manually
  const handleLocationReady = useCallback((loc) => {
    setUserLocation(loc)
    fetchDoctors(loc, filter)
  }, [filter, fetchDoctors])

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) { setError('Please select date and time'); return }
    if (bookedSlots.includes(selectedTime)) { setError('This slot is already booked'); return }
    setPaying(true)
    setError('')
    try {
      // check if this patient already booked this slot
      const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', selectedDoctor.id)
        .eq('patient_id', user.id)
        .eq('appointment_date', selectedDate)
        .eq('appointment_time', selectedTime)
        .in('status', ['pending', 'confirmed', 'accepted'])

      if (existing && existing.length > 0) {
        setError('You already have an appointment at this time')
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
      setSuccess(`Appointment request sent to Dr. ${selectedDoctor.full_name}! Awaiting clinic approval.`)
      setSelectedDoctor(null)
      setSelectedDate('')
      setSelectedTime('')
      setIssue('')
      setTimeout(() => setSuccess(''), 6000)
    } catch (err) {
      setError(err.message || 'Failed to book appointment. Please try again.')
    }
    setPaying(false)
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />
          <div className="px-4 sm:px-8 py-8">

            <div className="mb-4">
              <h1 className="text-2xl font-black text-gray-900">Find a Doctor</h1>
              <p className="text-gray-400 text-sm mt-1">Browse and book appointments</p>
            </div>

            <LocationBar onLocationReady={handleLocationReady} />

            {success && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                ⏳ {success}
                <button onClick={() => navigate('/my-appointments')} className="ml-auto text-amber-600 underline font-medium">
                  View Appointments
                </button>
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
              {SPECIALIZATIONS.map(spec => (
                <button key={spec} onClick={() => setFilter(spec)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    filter === spec ? 'bg-cyan-500 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-300'
                  }`}>
                  {spec}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-16 text-gray-400">Loading doctors…</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🩺</p>
                <p className="text-gray-500">No doctors found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different specialization or expand your search area</p>
              </div>
            ) : (
              <div className="space-y-4 max-w-2xl">
                {userLocation && (
                  <p className="text-xs text-gray-400 mb-1">Sorted by distance from your location</p>
                )}
                {doctors.map(doctor => (
                  <div key={doctor.id} className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0`}>
                        {getInitials(doctor.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800">Dr. {doctor.full_name}</h3>
                        <p className="text-cyan-600 text-sm">{doctor.specialization || 'General Physician'}</p>
                        <p className="text-gray-400 text-xs mt-0.5">📞 {doctor.phone}</p>
                        {doctor.distance_km != null && (
                          <p className="text-cyan-500 text-xs font-semibold mt-0.5">
                            📍 {Number(doctor.distance_km).toFixed(1)} km away
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-cyan-600 font-bold text-sm">₹{doctor.consultation_fee || 500}</p>
                        <button
                          onClick={() => {
                            setSelectedDoctor(doctor)
                            setError('')
                            setSelectedDate('')
                            setSelectedTime('')
                            setIssue('')
                          }}
                          className="mt-1 bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-cyan-600">
                          Book
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDoctor && (
              <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-4 pb-6 sm:pb-0">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-800 text-lg">Book Appointment</h2>
                    <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                  </div>

                  <div className="flex items-center gap-3 bg-cyan-50 rounded-xl p-3 mb-4">
                    <div className={`w-10 h-10 ${getColor(selectedDoctor.full_name)} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
                      {getInitials(selectedDoctor.full_name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">Dr. {selectedDoctor.full_name}</p>
                      <p className="text-cyan-600 text-sm">{selectedDoctor.specialization || 'General Physician'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Fee</p>
                      <p className="font-black text-cyan-600">₹{selectedDoctor.consultation_fee || 500}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Select Date</label>
                    <input type="date" min={today} value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800 text-sm" />
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 mb-2 block">Select Time Slot</label>
                    {!selectedDate ? (
                      <p className="text-gray-400 text-xs">Please select a date first</p>
                    ) : slotsLoading ? (
                      <p className="text-gray-400 text-xs">Loading available slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-red-400 text-xs">No availability on this day</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map(slot => {
                          const isBooked = bookedSlots.includes(slot)
                          const isSelected = selectedTime === slot
                          return (
                            <button
                              key={slot}
                              disabled={isBooked}
                              onClick={() => !isBooked && setSelectedTime(slot)}
                              className={`py-2 rounded-lg text-xs font-medium transition-all ${
                                isBooked
                                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                                  : isSelected
                                  ? 'bg-cyan-500 text-white'
                                  : 'bg-gray-50 text-gray-700 hover:bg-cyan-50'
                              }`}>
                              {slot}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Describe your issue (optional)</label>
                    <textarea value={issue} onChange={e => setIssue(e.target.value)}
                      placeholder="e.g. Fever and headache for 2 days…" rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none" />
                  </div>

                  {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">❌ {error}</div>}

                  <button onClick={handleBook} disabled={paying || !selectedTime}
                    className="w-full bg-cyan-500 text-white py-3 rounded-xl font-bold hover:bg-cyan-600 disabled:opacity-60 flex items-center justify-center gap-2">
                    {paying ? 'Booking…' : `📅 Request Appointment — ₹${selectedDoctor.consultation_fee ?? 500}`}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Doctors
