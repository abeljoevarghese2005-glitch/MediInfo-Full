import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { getDoctorProfile, updateDoctorProfile } from '../api/index'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DEFAULT_AVAIL = Object.fromEntries(
  DAYS.map(d => [d, {
    enabled: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(d),
    ranges: [{ start: '09:00', end: '17:00' }]
  }])
)

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

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`
}

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', specialization: '',
  consultation_fee: 500, experience_years: 0, clinic_name: '',
  license_number: '', time_per_patient: 15,
}

// ── Field row (view / edit) ──────────────────────────────────────────────────
function Field({ icon, label, value, editing, field, type = 'text', form, setForm, prefix }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      {editing ? (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{prefix}</span>
          )}
          <input
            type={type}
            value={form[field]}
            onChange={e => setForm(prev => ({
              ...prev,
              [field]: type === 'number' ? Number(e.target.value) : e.target.value
            }))}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-300 ${prefix ? 'pl-7 pr-3' : 'px-3'}`}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-800 font-medium bg-gray-50 rounded-xl px-3 py-2.5 min-h-[38px]">
          {prefix}{value || <span className="text-gray-300">—</span>}
        </p>
      )}
    </div>
  )
}

// ── Day availability row ─────────────────────────────────────────────────────
function DayRow({ day, d, editing, tpp, toggleDay, updateRange, addRange, removeRange }) {
  const slots = countSlots(d.ranges, tpp)
  const label = day.charAt(0).toUpperCase() + day.slice(1)

  return (
    <div className={`rounded-2xl border transition-all ${d.enabled ? 'border-cyan-100 bg-white shadow-sm' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Toggle */}
        <button
          onClick={() => editing && toggleDay(day)}
          disabled={!editing}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${d.enabled ? 'bg-cyan-500' : 'bg-gray-200'} ${!editing ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
        >
          <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${d.enabled ? 'translate-x-[20px]' : 'translate-x-0'}`} />
        </button>

        <span className={`text-sm font-bold w-24 ${d.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>

        {d.enabled && (
          <span className="ml-auto text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 rounded-full">
            {slots} slots
          </span>
        )}
        {!d.enabled && (
          <span className="ml-auto text-xs text-gray-400 italic">Unavailable</span>
        )}
      </div>

      {/* Time ranges */}
      {d.enabled && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-2">
          {d.ranges.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {editing ? (
                <>
                  <input type="time" value={r.start}
                    onChange={e => updateRange(day, idx, 'start', e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-700" />
                  <span className="text-gray-300 text-sm">–</span>
                  <input type="time" value={r.end}
                    onChange={e => updateRange(day, idx, 'end', e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-700" />
                  {d.ranges.length > 1 && (
                    <button onClick={() => removeRange(day, idx)}
                      className="ml-1 text-red-400 hover:text-red-600 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </>
              ) : (
                <span className="text-sm text-gray-600">{fmt12(r.start)} – {fmt12(r.end)}</span>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={() => addRange(day)}
              className="text-xs text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-1 mt-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add time range
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
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
      setEditAvail(JSON.parse(JSON.stringify(parsedAvail)))
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
    } catch {
      setError('Failed to load profile. Please refresh.')
    }
    setLoading(false)
  }

  const startEdit = () => {
    setEditAvail(JSON.parse(JSON.stringify(avail)))
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
      // Convert empty strings to null so the backend's exclude_none=True skips them
      // and the unique email constraint isn't violated by blank strings
      const sanitized = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      )
      const payload = { ...sanitized, availability: JSON.stringify(editAvail) }
      const res = await updateDoctorProfile(user.id, payload)
      const updated = res.data
      const newAvail = normalizeAvail(JSON.stringify(editAvail))
      setProfile({ ...updated, availability: JSON.stringify(editAvail) })
      setAvail(newAvail)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
      const stored = JSON.parse(sessionStorage.getItem('user') || '{}')
      sessionStorage.setItem('user', JSON.stringify({ ...stored, full_name: updated.full_name }))
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please try again.')
    }
    setSaving(false)
  }

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

  const displayName = profile?.full_name || user.full_name || 'Doctor'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (loading) return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">Loading profile…</div>
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

          <div className="flex-1 px-4 sm:px-6 lg:px-10 py-6 max-w-6xl">

            {/* Toast notifications */}
            {saved && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Profile updated. Patients will see your new availability when booking.
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Back link */}
            <button
              onClick={() => navigate('/doctor-dashboard')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to dashboard
            </button>

            {/* ── Hero card ─────────────────────────────────────────────── */}
            <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/60 border border-gray-100 rounded-3xl p-6 mb-6 shadow-sm overflow-hidden">
              {/* Decorative blob */}
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-cyan-100/40 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute right-20 -bottom-6 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl pointer-events-none" />

              <div className="relative flex items-center gap-5">
                {/* Avatar */}
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="text-2xl font-black text-gray-900">
                      Dr. {displayName}
                    </h1>
                    <svg className="w-5 h-5 text-cyan-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-sm text-cyan-600 font-semibold">{profile?.specialization || 'General Physician'}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-500">{profile?.experience_years || 0} yrs experience</span>
                  </div>

                  {profile?.clinic_name && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm text-gray-500">{profile.clinic_name}</span>
                    </div>
                  )}
                </div>

                {/* Edit / Save buttons */}
                {!editing ? (
                  <button
                    onClick={startEdit}
                    className="shrink-0 flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit profile
                  </button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={cancelEdit}
                      className="border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-60 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Two-column body ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">

              {/* LEFT — Basic Information */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h2 className="text-base font-black text-gray-800">Basic information</h2>
                </div>
                <p className="text-xs text-gray-400 mb-5">Patients see this when booking with you.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                    label="Full name" field="full_name" value={profile?.full_name}
                    editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                    label="Phone" field="phone" type="tel" value={profile?.phone}
                    editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                    label="Email" field="email" type="email" value={profile?.email}
                    editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                    label="Specialization" field="specialization" value={profile?.specialization}
                    editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    label="Experience (years)" field="experience_years" type="number" value={profile?.experience_years}
                    editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    label="Clinic / Hospital" field="clinic_name" value={profile?.clinic_name}
                    editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    label="Consultation Fee (₹)" field="consultation_fee" type="number" value={profile?.consultation_fee}
                    prefix="₹" editing={editing} form={form} setForm={setForm}
                  />
                  <Field
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                    label="License number" field="license_number" value={profile?.license_number}
                    editing={editing} form={form} setForm={setForm}
                  />
                </div>
              </div>

              {/* RIGHT — Weekly availability */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-4 h-4 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-base font-black text-gray-800">Weekly availability & slots</h2>
                </div>
                <p className="text-xs text-gray-400 mb-4">Add multiple time blocks per day (e.g. 10–2 PM and 4–8 PM).</p>

                {/* Time per patient */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-600">Time per patient</span>
                  </div>
                  {editing ? (
                    <select
                      value={form.time_per_patient}
                      onChange={e => setForm(prev => ({ ...prev, time_per_patient: Number(e.target.value) }))}
                      className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-700"
                    >
                      {[5, 10, 15, 20, 30, 45, 60].map(m => (
                        <option key={m} value={m}>{m} min</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-gray-700">{currentTpp} minutes per patient</span>
                  )}
                </div>

                {/* Days */}
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <DayRow
                      key={day}
                      day={day}
                      d={currentAvail[day] || { enabled: false, ranges: [] }}
                      editing={editing}
                      tpp={currentTpp}
                      toggleDay={toggleDay}
                      updateRange={updateRange}
                      addRange={addRange}
                      removeRange={removeRange}
                    />
                  ))}
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
