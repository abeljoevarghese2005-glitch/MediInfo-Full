import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { getDoctorProfile, updateDoctorProfile } from '../api/index'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_AVAIL = Object.fromEntries(
  DAYS.map(d => [d, {
    enabled: ['monday','tuesday','wednesday','thursday','friday'].includes(d),
    ranges: [{ start: '09:00', end: '17:00' }]
  }])
)

// Parse old format {enabled, start, end} OR new format {enabled, ranges:[]}
function normalizeAvail(raw) {
  if (!raw) return DEFAULT_AVAIL
  let parsed
  try { parsed = JSON.parse(raw) } catch { return DEFAULT_AVAIL }
  const result = {}
  for (const day of DAYS) {
    const d = parsed[day] || DEFAULT_AVAIL[day]
    result[day] = {
      enabled: !!d.enabled,
      ranges: d.ranges || (d.start && d.end ? [{ start: d.start, end: d.end }] : [{ start: '09:00', end: '17:00' }])
    }
  }
  return result
}

function countSlots(ranges, minsPerSlot) {
  if (!ranges || !minsPerSlot) return 0
  return ranges.reduce((total, r) => {
    const [sh, sm] = r.start.split(':').map(Number)
    const [eh, em] = r.end.split(':').map(Number)
    const mins = (eh * 60 + em) - (sh * 60 + sm)
    return total + (mins > 0 ? Math.floor(mins / minsPerSlot) : 0)
  }, 0)
}

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', specialization: '',
  consultation_fee: 500, experience_years: 0, clinic_name: '',
  license_number: '', time_per_patient: 15,
}

function DoctorProfile() {
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [avail, setAvail] = useState(DEFAULT_AVAIL)
  const [editAvail, setEditAvail] = useState(DEFAULT_AVAIL)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getDoctorProfile(user.id)
      const data = res.data
      setProfile(data)
      const parsedAvail = normalizeAvail(data.availability)
      setAvail(parsedAvail)
      setEditAvail(JSON.parse(JSON.stringify(parsedAvail))) // deep copy
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
    } catch (e) {
      setError('Failed to load profile. Please refresh.')
    }
    setLoading(false)
  }

  const startEdit = () => {
    setEditAvail(JSON.parse(JSON.stringify(avail))) // fresh deep copy
    setEditing(true)
  }

  const cancelEdit = () => {
    fetchProfile()
    setEditing(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, availability: JSON.stringify(editAvail) }
      const res = await updateDoctorProfile(user.id, payload)
      const updated = res.data
      const newAvail = normalizeAvail(JSON.stringify(editAvail))
      setProfile({ ...updated, availability: JSON.stringify(editAvail) })
      setAvail(newAvail)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
      // Update sessionStorage name
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}')
      sessionStorage.setItem('user', JSON.stringify({ ...stored, full_name: updated.full_name }))
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please try again.')
    }
    setSaving(false)
  }

  // Availability helpers (operate on editAvail)
  const toggleDay = (day) =>
    setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))

  const updateRange = (day, idx, field, value) =>
    setEditAvail(prev => {
      const ranges = prev[day].ranges.map((r, i) => i === idx ? { ...r, [field]: value } : r)
      return { ...prev, [day]: { ...prev[day], ranges } }
    })

  const addRange = (day) =>
    setEditAvail(prev => ({
      ...prev,
      [day]: { ...prev[day], ranges: [...prev[day].ranges, { start: '09:00', end: '17:00' }] }
    }))

  const removeRange = (day, idx) =>
    setEditAvail(prev => ({
      ...prev,
      [day]: { ...prev[day], ranges: prev[day].ranges.filter((_, i) => i !== idx) }
    }))

  const currentAvail = editing ? editAvail : avail
  const currentTpp = editing ? form.time_per_patient : (profile?.time_per_patient || 15)

  const fields = [
    { label: 'Full name', field: 'full_name', type: 'text' },
    { label: 'Phone', field: 'phone', type: 'tel' },
    { label: 'Email', field: 'email', type: 'email' },
    { label: 'Specialization', field: 'specialization', type: 'text' },
    { label: 'Experience (years)', field: 'experience_years', type: 'number' },
    { label: 'Clinic / Hospital', field: 'clinic_name', type: 'text' },
    { label: 'Consultation Fee (₹)', field: 'consultation_fee', type: 'number' },
    { label: 'License number', field: 'license_number', type: 'text' },
  ]

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
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">

            {/* Notifications */}
            {saved && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
                Profile updated. Patients will see your new availability when booking.
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Header card */}
            <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-5 mb-5 flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white font-black text-2xl shrink-0">
                {(profile?.full_name || user.full_name || 'D').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-white font-black text-lg truncate">{profile?.full_name || user.full_name}</h1>
                </div>
                <p className="text-cyan-100 text-sm">{profile?.specialization || 'General Physician'} · {profile?.experience_years || 0} yrs experience</p>
                {profile?.clinic_name && <p className="text-cyan-200 text-xs mt-0.5">{profile.clinic_name}</p>}
              </div>
              {!editing ? (
                <button onClick={startEdit}
                  className="shrink-0 bg-white text-cyan-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-cyan-50 transition-colors">
                  Edit profile
                </button>
              ) : (
                <div className="flex gap-2 shrink-0">
                  <button onClick={cancelEdit}
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

            {/* Two column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

              {/* Basic Information */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-black text-gray-800 mb-0.5">Basic information</h2>
                <p className="text-xs text-gray-400 mb-4">Patients see this information when booking with you.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {fields.map(({ label, field, type }) => (
                    <div key={field}>
                      <label className="text-xs text-gray-400 font-semibold block mb-1">{label}</label>
                      {editing ? (
                        <input
                          type={type}
                          value={form[field]}
                          onChange={e => setForm(prev => ({
                            ...prev,
                            [field]: type === 'number' ? Number(e.target.value) : e.target.value
                          }))}
                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-800"
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-700">
                          {field === 'consultation_fee'
                            ? `₹${profile?.[field] ?? '—'}`
                            : profile?.[field] || '—'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Availability */}
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-black text-gray-800 mb-0.5">Weekly availability & slots</h2>
                <p className="text-xs text-gray-400 mb-4">Set your working hours and available time ranges per day.</p>

                {/* Time per patient */}
                <div className="mb-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Time per patient</p>
                    {!editing && <p className="text-sm text-gray-700">{currentTpp} minutes</p>}
                  </div>
                  {editing ? (
                    <select
                      value={form.time_per_patient}
                      onChange={e => setForm(prev => ({ ...prev, time_per_patient: Number(e.target.value) }))}
                      className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      {[5, 10, 15, 20, 30, 45, 60].map(m => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  ) : null}
                </div>

                {/* Days */}
                <div className="space-y-2">
                  {DAYS.map(day => {
                    const d = currentAvail[day] || { enabled: false, ranges: [] }
                    const slots = countSlots(d.ranges, currentTpp)
                    return (
                      <div key={day} className={`rounded-xl border p-3 transition-colors ${d.enabled ? 'border-cyan-100 bg-cyan-50/40' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          {/* Toggle */}
                          <button
                            onClick={() => editing && toggleDay(day)}
                            disabled={!editing}
                            className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${d.enabled ? 'bg-cyan-500' : 'bg-gray-300'} ${!editing ? 'cursor-default' : 'cursor-pointer'}`}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${d.enabled ? 'left-4' : 'left-0.5'}`} />
                          </button>
                          <span className={`w-20 text-sm font-semibold capitalize ${d.enabled ? 'text-gray-800' : 'text-gray-400'}`}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </span>
                          {d.enabled && (
                            <span className="ml-auto text-xs bg-cyan-100 text-cyan-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                              {slots} slots
                            </span>
                          )}
                          {!d.enabled && <span className="ml-auto text-xs text-gray-400 italic">Unavailable</span>}
                        </div>

                        {/* Time ranges */}
                        {d.enabled && (
                          <div className="mt-2 space-y-1.5 pl-12">
                            {d.ranges.map((r, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {editing ? (
                                  <>
                                    <input type="time" value={r.start}
                                      onChange={e => updateRange(day, idx, 'start', e.target.value)}
                                      className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                                    <span className="text-gray-400 text-xs">–</span>
                                    <input type="time" value={r.end}
                                      onChange={e => updateRange(day, idx, 'end', e.target.value)}
                                      className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                                    {d.ranges.length > 1 && (
                                      <button onClick={() => removeRange(day, idx)}
                                        className="text-red-400 hover:text-red-600 text-xs font-bold px-1">
                                        ✕
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-600">{r.start} – {r.end}</span>
                                )}
                              </div>
                            ))}
                            {editing && (
                              <button onClick={() => addRange(day)}
                                className="text-xs text-cyan-600 font-semibold hover:text-cyan-700 mt-1">
                                + Add time range
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorProfile
