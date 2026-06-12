import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

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

function Field({ icon, label, value, editing, field, type = 'text', form, setForm, prefix }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      {editing ? (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">{prefix}</span>}
          <input type={type} value={form[field]}
            onChange={e => setForm(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-300 ${prefix ? 'pl-7 pr-3' : 'px-3'}`} />
        </div>
      ) : (
        <p className="text-sm text-gray-800 font-medium bg-gray-50 rounded-xl px-3 py-2.5 min-h-[38px]">
          {prefix}{value || <span className="text-gray-300">—</span>}
        </p>
      )}
    </div>
  )
}

function DayRow({ day, d, editing, tpp, toggleDay, updateRange, addRange, removeRange }) {
  const slots = countSlots(d.ranges, tpp)
  const label = day.charAt(0).toUpperCase() + day.slice(1)
  return (
    <div className={`rounded-2xl border transition-all ${d.enabled ? 'border-cyan-100 bg-white shadow-sm' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => editing && toggleDay(day)} disabled={!editing}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${d.enabled ? 'bg-cyan-500' : 'bg-gray-200'} ${!editing ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
          <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${d.enabled ? 'translate-x-[20px]' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-bold w-24 ${d.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        {d.enabled
          ? <span className="ml-auto text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-0.5 rounded-full">{slots} slots</span>
          : <span className="ml-auto text-xs text-gray-400 italic">Unavailable</span>
        }
      </div>
      {d.enabled && (
        <div className="px-4 pb-3 space-y-2 border-t border-gray-100 pt-2">
          {d.ranges.map((r, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {editing ? (
                <>
                  <input type="time" value={r.start} onChange={e => updateRange(day, idx, 'start', e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-700" />
                  <span className="text-gray-300 text-sm">—</span>
                  <input type="time" value={r.end} onChange={e => updateRange(day, idx, 'end', e.target.value)}
                    className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-700" />
                  {d.ranges.length > 1 && (
                    <button onClick={() => removeRange(day, idx)} className="ml-1 text-red-400 hover:text-red-600 w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-50">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </>
              ) : (
                <span className="text-sm text-gray-600">{fmt12(r.start)} — {fmt12(r.end)}</span>
              )}
            </div>
          ))}
          {editing && (
            <button onClick={() => addRange(day)} className="text-xs text-cyan-600 font-semibold hover:text-cyan-700 flex items-center gap-1 mt-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Add time range
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function DoctorProfile() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (error) throw error
      const normalized = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v === '' ? null : v]))
      setProfile(normalized)
      const parsedAvail = normalizeAvail(normalized.availability)
      setAvail(parsedAvail)
      setEditAvail(JSON.parse(JSON.stringify(parsedAvail)))
      setForm({
        full_name: normalized.full_name || '',
        phone: normalized.phone || '',
        email: normalized.email || '',
        specialization: normalized.specialization || '',
        consultation_fee: normalized.consultation_fee || 500,
        experience_years: normalized.experience_years || 0,
        clinic_name: normalized.clinic_name || '',
        license_number: normalized.license_number || '',
        time_per_patient: normalized.time_per_patient || 15,
      })
    } catch { setError('Failed to load profile. Please refresh.') }
    setLoading(false)
  }

  const startEdit = () => { setEditAvail(JSON.parse(JSON.stringify(avail))); setEditing(true) }
  const cancelEdit = () => { fetchProfile(); setEditing(false) }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const sanitized = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
      const payload = { ...sanitized, availability: JSON.stringify(editAvail) }
      const { data: updated, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', user.id)
        .select()
        .single()
      if (error) throw error
      const newAvail = normalizeAvail(JSON.stringify(editAvail))
      setProfile({ ...updated, availability: JSON.stringify(editAvail) })
      setAvail(newAvail)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, full_name: updated.full_name }))
    } catch (e) { setError(e.message || 'Failed to save. Please try again.') }
    setSaving(false)
  }

  const toggleDay = (day) => setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))
  const updateRange = (day, idx, field, value) => setEditAvail(prev => {
    const ranges = prev[day].ranges.map((r, i) => i === idx ? { ...r, [field]: value } : r)
    return { ...prev, [day]: { ...prev[day], ranges } }
  })
  const addRange = (day) => setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], ranges: [...prev[day].ranges, { start: '09:00', end: '17:00' }] } }))
  const removeRange = (day, idx) => setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], ranges: prev[day].ranges.filter((_, i) => i !== idx) } }))

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

            {saved && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                ✅ Profile updated. Patients will see your new availability when booking.
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <button onClick={() => navigate('/doctor-dashboard')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
              ← Back to dashboard
            </button>

            <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/60 border border-gray-100 rounded-3xl p-6 mb-6 shadow-sm overflow-hidden">
              <div className="relative flex items-center gap-5">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">{initials}</div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-black text-gray-900">Dr. {displayName}</h1>
                  <p className="text-sm text-cyan-600 font-semibold">{profile?.specialization || 'General Physician'} · {profile?.experience_years || 0} yrs</p>
                  {profile?.clinic_name && <p className="text-sm text-gray-500 mt-0.5">{profile.clinic_name}</p>}
                </div>
                {!editing ? (
                  <button onClick={startEdit} className="shrink-0 bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">Edit profile</button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={cancelEdit} className="border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-60">
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-black text-gray-800 mb-5">Basic information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field icon="👤" label="Full name" field="full_name" value={profile?.full_name} editing={editing} form={form} setForm={setForm} />
                  <Field icon="📞" label="Phone" field="phone" type="tel" value={profile?.phone} editing={editing} form={form} setForm={setForm} />
                  <Field icon="✉️" label="Email" field="email" type="email" value={profile?.email} editing={editing} form={form} setForm={setForm} />
                  <Field icon="🩺" label="Specialization" field="specialization" value={profile?.specialization} editing={editing} form={form} setForm={setForm} />
                  <Field icon="📅" label="Experience (years)" field="experience_years" type="number" value={profile?.experience_years} editing={editing} form={form} setForm={setForm} />
                  <Field icon="🏥" label="Clinic / Hospital" field="clinic_name" value={profile?.clinic_name} editing={editing} form={form} setForm={setForm} />
                  <Field icon="💰" label="Consultation Fee (₹)" field="consultation_fee" type="number" value={profile?.consultation_fee} prefix="₹" editing={editing} form={form} setForm={setForm} />
                  <Field icon="🔒" label="License number" field="license_number" value={profile?.license_number} editing={editing} form={form} setForm={setForm} />
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-base font-black text-gray-800 mb-1">Weekly availability & slots</h2>
                <p className="text-xs text-gray-400 mb-4">Add multiple time blocks per day.</p>
                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4">
                  <span className="text-sm font-semibold text-gray-600">⏱ Time per patient</span>
                  {editing ? (
                    <select value={form.time_per_patient} onChange={e => setForm(prev => ({ ...prev, time_per_patient: Number(e.target.value) }))}
                      className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 text-gray-700">
                      {[5, 10, 15, 20, 30, 45, 60].map(m => <option key={m} value={m}>{m} min</option>)}
                    </select>
                  ) : (
                    <span className="text-sm font-bold text-gray-700">{currentTpp} minutes per patient</span>
                  )}
                </div>
                <div className="space-y-2">
                  {DAYS.map(day => (
                    <DayRow key={day} day={day} d={currentAvail[day] || { enabled: false, ranges: [] }}
                      editing={editing} tpp={currentTpp} toggleDay={toggleDay}
                      updateRange={updateRange} addRange={addRange} removeRange={removeRange} />
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
