import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getDoctors, bookAppointment } from '../api/index'

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
]

const SPECIALIZATIONS = [
  'All', 'General Physician', 'Cardiologist', 'Dermatologist',
  'Neurologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist', 'ENT'
]

function Doctors() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [booking, setBooking] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDoctors()
  }, [filter])

  const fetchDoctors = async () => {
    setLoading(true)
    try {
      const res = await getDoctors(filter === 'All' ? '' : filter)
      setDoctors(res.data)
    } catch {
      setDoctors([])
    }
    setLoading(false)
  }

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select both date and time')
      return
    }
    setBooking(true)
    setError('')
    try {
      await bookAppointment(user.id, {
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
      })
      setSuccess(`Appointment booked with Dr. ${selectedDoctor.full_name}!`)
      setSelectedDoctor(null)
      setSelectedDate('')
      setSelectedTime('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Booking failed')
    }
    setBooking(false)
  }

  // Min date = today
  const today = new Date().toISOString().split('T')[0]

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'D'

  const avatarColors = [
    'bg-cyan-500', 'bg-purple-500', 'bg-green-500',
    'bg-orange-500', 'bg-pink-500', 'bg-blue-500'
  ]
  const getColor = (name) => avatarColors[name?.charCodeAt(0) % avatarColors.length]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Find a Doctor</h1>
          <p className="text-gray-500 text-sm mt-1">Browse and book appointments</p>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            ✅ {success}
            <button onClick={() => navigate('/my-appointments')} className="ml-auto text-green-600 underline font-medium">
              View Appointments
            </button>
          </div>
        )}

        {/* Specialization Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {SPECIALIZATIONS.map(spec => (
            <button
              key={spec}
              onClick={() => setFilter(spec)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === spec
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-cyan-300'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>

        {/* Doctor Cards */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🩺</p>
            <p className="text-gray-500">No doctors found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different specialization</p>
          </div>
        ) : (
          <div className="space-y-4">
            {doctors.map(doctor => (
              <div key={doctor.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 ${getColor(doctor.full_name)} rounded-full flex items-center justify-center text-white text-xl font-bold`}>
                    {getInitials(doctor.full_name)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">Dr. {doctor.full_name}</h3>
                    <p className="text-cyan-600 text-sm">{doctor.specialization || 'General Physician'}</p>
                    <p className="text-gray-400 text-xs mt-0.5">📞 {doctor.phone}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedDoctor(doctor); setError(''); setSelectedDate(''); setSelectedTime('') }}
                    className="bg-cyan-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-cyan-600"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {selectedDoctor && (
          <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-50 px-4 pb-6">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-800 text-lg">Book Appointment</h2>
                <button onClick={() => setSelectedDoctor(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>

              {/* Doctor Info */}
              <div className="flex items-center gap-3 bg-cyan-50 rounded-xl p-3 mb-5">
                <div className={`w-10 h-10 ${getColor(selectedDoctor.full_name)} rounded-full flex items-center justify-center text-white font-bold`}>
                  {getInitials(selectedDoctor.full_name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Dr. {selectedDoctor.full_name}</p>
                  <p className="text-cyan-600 text-sm">{selectedDoctor.specialization || 'General Physician'}</p>
                </div>
              </div>

              {/* Date Picker */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 mb-1 block">Select Date</label>
                <input
                  type="date"
                  min={today}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800"
                />
              </div>

              {/* Time Slots */}
              <div className="mb-5">
                <label className="text-xs text-gray-500 mb-2 block">Select Time Slot</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 rounded-lg text-sm font-medium transition-all ${
                        selectedTime === slot
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-50 text-gray-700 hover:bg-cyan-50'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">
                  ❌ {error}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={booking}
                className="w-full bg-cyan-500 text-white py-3 rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-60"
              >
                {booking ? 'Booking...' : 'Confirm Appointment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Doctors