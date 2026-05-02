import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { getDoctors, getMyAppointments, bookAppointment } from '../api/index'

const TIME_SLOTS = ['10:30', '13:00', '16:00', '09:00', '11:00', '14:00']

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

// Assign a mock "next available" slot to each doctor for display
const mockSlot = (idx) => {
  const slots = ['Today, 10:00 AM', 'Today, 1:00 PM', 'Today, 11:30 AM', 'Today, 4:30 PM', 'Today, 9:30 AM', 'Tomorrow, 10:00 AM']
  return slots[idx % slots.length]
}

const mockFee = (idx) => {
  const fees = [800, 700, 550, 900, 600, 750]
  return fees[idx % fees.length]
}

const mockDist = (idx) => {
  const dists = ['0.8 km', '1.2 km', '1.4 km', '1.7 km', '2.0 km', '2.3 km']
  return dists[idx % dists.length]
}

const mockRating = (idx) => {
  const ratings = [4.9, 4.8, 4.6, 4.9, 4.7, 4.5]
  return ratings[idx % ratings.length]
}

function BookingModal({ doctor, idx, onClose, onBooked }) {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState(TIME_SLOTS[0])
  const [issue, setIssue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fee = doctor.consultation_fee || mockFee(idx)

  const handleBook = async () => {
    if (!date || !slot) { setError('Please select date and time'); return }
    setLoading(true)
    setError('')
    try {
      await bookAppointment(user.id, {
        doctor_id: doctor.id,
        appointment_date: date,
        appointment_time: slot,
        issue: issue || null,
      })
      // Appointment is created as PENDING — receptionist must confirm it
      onBooked(`Appointment request sent to Dr. ${doctor.full_name}! Awaiting clinic approval.`)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to book appointment. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
              {getInitials(doctor.full_name)}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Dr. {doctor.full_name}</h3>
              <p className="text-cyan-500 text-sm">{doctor.specialization || 'General Physician'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Fee banner */}
        <div className="bg-cyan-50 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">Consultation Fee</span>
          <span className="text-xl font-black text-cyan-600">₹{fee}</span>
        </div>

        {/* Date */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Date</label>
          <input
            type="date" min={today} value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>

        {/* Time slots */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-500 mb-2 block">Select Time Slot</label>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map(s => (
              <button key={s} onClick={() => setSlot(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  slot === s ? 'bg-cyan-500 text-white' : 'border border-gray-200 text-gray-600 hover:border-cyan-300'
                }`}>
                {formatSlot(s)}
              </button>
            ))}
          </div>
        </div>

        {/* Issue */}
        <div className="mb-5">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Describe your issue</label>
          <textarea value={issue} onChange={e => setIssue(e.target.value)}
            placeholder="e.g. Persistent cough for 5 days..."
            rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
          />
        </div>

        {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-3">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleBook} disabled={loading}
            className="py-3 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600 disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? 'Booking...' : `📅 Book — ₹${fee}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function DoctorCard({ doctor, idx, onBook }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
            {getInitials(doctor.full_name)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Dr. {doctor.full_name}</h3>
            <p className="text-cyan-500 text-xs font-medium">{doctor.specialization || 'General Physician'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-green-500 text-xs font-bold">
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {mockRating(idx)}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {doctor.years_of_experience ? `${doctor.years_of_experience} yrs` : '5 yrs'}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          {mockDist(idx)}
        </span>
        <span>₹ {doctor.consultation_fee ?? mockFee(idx)}</span>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {mockSlot(idx)}
        </span>
        <button
          onClick={() => onBook(doctor, idx)}
          className="bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-cyan-600 transition-colors"
        >
          Book Now
        </button>
      </div>
    </div>
  )
}

function Home() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [query, setQuery] = useState('')
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [previousDoctors, setPreviousDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchDoctors()
    fetchPrevious()
  }, [])

  const fetchDoctors = async () => {
    setLoadingDoctors(true)
    try {
      const res = await getDoctors('')
      setDoctors(res.data.slice(0, 4))
    } catch {
      setDoctors([])
    }
    setLoadingDoctors(false)
  }

  const fetchPrevious = async () => {
    try {
      const res = await getMyAppointments(user.id)
      // Get unique doctors from past appointments
      const seen = new Set()
      const prev = []
      for (const appt of res.data) {
        if (!seen.has(appt.doctor_id)) {
          seen.add(appt.doctor_id)
          prev.push(appt)
        }
      }
      setPreviousDoctors(prev.slice(0, 2))
    } catch {
      setPreviousDoctors([])
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${query}`)
  }

  const handleBook = (doctor, idx) => {
    setSelectedDoctor(doctor)
    setSelectedIdx(idx)
  }

  const handleBooked = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning,'
    if (h < 17) return 'Good afternoon,'
    return 'Good evening,'
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />
          <div className="flex-1 px-4 sm:px-8 py-8 max-w-5xl w-full">
            {/* Greeting */}
            <p className="text-gray-400 text-sm font-medium mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-black text-gray-900 mb-6">
              Hi {user.full_name?.split(' ')[0]}, how can we help today?
            </h1>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm gap-3 max-w-2xl">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search doctor or clinic"
                  className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent"
                />
              </div>
            </form>

            {success && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2 max-w-2xl">
                ⏳ {success}
                <button onClick={() => navigate('/my-appointments')} className="ml-auto text-amber-600 underline font-medium">
                  View Appointments →
                </button>
              </div>
            )}

            {/* Nearby Clinics */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    Nearby Clinics
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">Within 2–3 km of you</p>
                </div>
                <button onClick={() => navigate('/doctors')} className="text-cyan-500 text-sm font-semibold hover:underline">
                  See all →
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
                  No doctors found nearby
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctors.map((doc, idx) => (
                    <DoctorCard key={doc.id} doctor={doc} idx={idx} onBook={handleBook} />
                  ))}
                </div>
              )}
            </div>

            {/* Previously Visited */}
            <div>
              <div className="mb-3">
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Previously Visited
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Quick rebook in one tap</p>
              </div>

              {previousDoctors.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <p className="text-gray-400 text-sm">Doctors you visit will show up here for quick rebooking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {previousDoctors.map((appt, idx) => (
                    <div key={appt.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${getColor(appt.doctor_name)} rounded-full flex items-center justify-center text-white font-bold text-xs`}>
                          {getInitials(appt.doctor_name)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">Dr. {appt.doctor_name}</p>
                          <p className="text-cyan-500 text-xs">{appt.specialization}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/doctors')}
                        className="text-cyan-500 text-xs font-bold bg-cyan-50 px-3 py-1.5 rounded-lg hover:bg-cyan-100"
                      >
                        Rebook
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
              onBooked={handleBooked}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Home