import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { getDoctorProfile, updateDoctorProfile } from '../api/index'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_AVAILABILITY = Object.fromEntries(
  DAYS.map(d => [d, { enabled: ['monday','tuesday','wednesday','thursday','friday'].includes(d), start: '09:00', end: '17:00' }])
)

function countSlots(start, end, minsPerSlot) {
  if (!start || !end || !minsPerSlot) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const total = (eh * 60 + em) - (sh * 60 + sm)
  return total > 0 ? Math.floor(total / minsPerSlot) : 0
}

function DoctorProfile() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [avail, setAvail] = useState(DEFAULT_AVAILABILITY)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const res = await getDoctorProfile(user.id)
      const data = res.data
      setProfile(data)
      let parsedAvail = DEFAULT_AVAILABILITY
      if (data.availability) {
        try { parsedAvail = { ...DEFAULT_AVAILABILITY, ...JSON.parse(data.availability) } } catch {}
      }
      setAvail(parsedAvail)
      setForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        email: data.email || '',
        specialization: data.specialization || '',
        consultation_fee: data.consultation_fee || 500,
        experience_years: data.experience_years || 0,
        clinic_name: data.clinic_name || '',
        license_number: data.license_number || '',
        time_per_patient: data.time_per_patient || 15,
      })
    } catch {}
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, availability: JSON.stringify(avail) }
      const res = await updateDoctorProfile(user.id, payload)
      const updated = res.data
      setProfile({ ...updated, availability: JSON.stringify(avail) })
      const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}')
      sessionStorage.setItem('user', JSON.stringify({
        ...storedUser,
        full_name: updated.full_name,
        phone: updated.phone,
        specialization: updated.specialization,
        consultation_fee: updated.consultation_fee,
        email: updated.email,
      }))
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save. Please try again.')
    }
    setSaving(false)
  }

  const toggleDay = (day) =>
    setAvail(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))

  const updateDayTime = (day, field, value) =>
    setAvail(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }))

  if (loading) return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">Loading profile...</div>
        </div>
      </div>
    </SidebarProvider>
  )

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-3xl">

            {saved && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                ✅ Profile updated! Patients will see your new availability when booking.
              </div>
            )}

            {/* Header card */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-5 mb-5 flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0">
                {profile?.full_name?.charAt(0).toUpperCase() || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-black text-lg truncate">{profile?.full_name}</h1>
                  <span className="text-cyan-200 text-sm">✓</span>
                </div>
                <p className="text-cyan-100 text-sm">{profile?.specialization || 'General Physician'} · {profile?.experience_years || 0} yrs experience</p>
                {profile?.clinic_name && <p className="text-cyan-200 text-xs mt-0.5">🏥 {profile.clinic_name}</p>}
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="shrink-0 bg-white text-cyan-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-50 transition-colors flex items-center gap-1.5">
                  ✏️ Edit profile
                </button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditing(false); fetchProfile() }}
                    className="bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-white/30 transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="bg-white text-cyan-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-50 disabled:opacity-60 transition-colors">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {/* Basic Information */}
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
              <h2 className="text-sm font-black text-gray-800 mb-0.5">Basic information</h2>
              <p className="text-xs text-gray-400 mb-4">Patients see this information when booking with you.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full name', icon: '👤', field: 'full_name', type: 'text' },
                  { label: 'Phone', icon: '📞', field: 'phone', type: 'tel' },
                  { label: 'Email', icon: '✉️', field: 'email', type: 'email' },
                  { label: 'Specialization', icon: '🩺', field: 'specialization', type: 'text' },
                  { label: 'Experience (years)', icon: '🎓', field: 'experience_years', type: 'number' },
                  { label: 'Clinic / Hospital', icon: '🏥', field: 'clinic_name', type: 'text' },
                  { label: 'Consultation Fee (₹)', icon: '💰', field: 'consultation_fee', type: 'number' },
                  { label: 'License number', icon: '🪪', field: 'license_number', type: 'text' },
                ].map(({ label, icon, field, type }) => (
                  <div key={field}>
                    <label className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold mb-1">
                      <span>{icon}</span> {label}
                    </label>
                    {editing ? (
                      <input
                        type={type}
                        value={form[field]}
                        onChange={e => setForm(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-800"
                      />
                    ) : (
                      <div className="px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-700 border border-transparent">
                        {field === 'consultation_fee' ? `₹${profile?.[field] || '—'}` : profile?.[field] || '—'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly availability */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">📅</span>
                <h2 className="text-sm font-black text-gray-800">Weekly availability & slots</h2>
              </div>
              <p className="text-xs text-gray-400 mb-4">Set your working hours and how long each patient visit takes.</p>

              {/* Time per patient */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">⏱️</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Time per patient</p>
                    {!editing && <p className="text-sm text-gray-700">{form?.time_per_patient || 15} minutes per patient</p>}
                  </div>
                </div>
                {editing && (
                  <select
                    value={form.time_per_patient}
                    onChange={e => setForm(prev => ({ ...prev, time_per_patient: Number(e.target.value) }))}
                    className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                  >
                    {[5, 10, 15, 20, 30, 45, 60].map(m => (
                      <option key={m} value={m}>{m} minutes</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Days */}
              <div className="space-y-2">
                {DAYS.map(day => {
                  const d = avail[day] || { enabled: false, start: '09:00', end: '17:00' }
                  const slots = countSlots(d.start, d.end, form?.time_per_patient || 15)
                  return (
                    <div key={day}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${d.enabled ? 'border-cyan-100 bg-cyan-50/50' : 'border-gray-100 bg-gray-50'}`}>
                      {/* Toggle */}
                      <button
                        onClick={() => editing && toggleDay(day)}
                        disabled={!editing}
                        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${d.enabled ? 'bg-cyan-500' : 'bg-gray-300'} ${!editing ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.enabled ? 'left-5' : 'left-1'}`} />
                      </button>
                      <span className={`w-24 text-sm font-semibold capitalize ${d.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </span>
                      {d.enabled ? (
                        editing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input type="time" value={d.start}
                              onChange={e => updateDayTime(day, 'start', e.target.value)}
                              className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                            <span className="text-gray-400 text-xs">to</span>
                            <input type="time" value={d.end}
                              onChange={e => updateDayTime(day, 'end', e.target.value)}
                              className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                            <span className="ml-auto text-xs bg-cyan-100 text-cyan-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                              {slots} slots
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm text-gray-600">⏰ {d.start} – {d.end}</span>
                            <span className="ml-auto text-xs bg-cyan-100 text-cyan-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                              {slots} slots
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unavailable</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorProfile
