import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
]

const CONSULTATION_MODES = [
  { key: 'offers_in_clinic', label: 'In-clinic', icon: '🏥' },
  { key: 'offers_video', label: 'Video consultation', icon: '🎥' },
  { key: 'offers_home_visit', label: 'Home visit', icon: '🏠' },
]

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
  offers_in_clinic: true, offers_video: false, offers_home_visit: false,
}

const EMPTY_BIO_FORM = {
  description: '',
  bio: '',
  services: [],
  awards: [],
}

const EMPTY_QUAL = { degree: '', institution: '', year: '' }

function Field({ icon, label, value, editing, field, type = 'text', form, setForm, prefix }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      {editing ? (
        <div className="relative">
          {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium pointer-events-none">{prefix}</span>}
          <input type={type} value={form[field]}
            onChange={e => setForm(prev => ({ ...prev, [field]: type === 'number' ? Number(e.target.value) : e.target.value }))}
            className={`w-full border border-gray-200 rounded-xl py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-300 ${prefix ? 'pr-3' : 'px-3'}`}
            style={prefix ? { paddingLeft: `${prefix.length * 0.5 + 0.75}rem` } : undefined} />
        </div>
      ) : (
        <p className="text-sm text-gray-800 font-medium bg-gray-50 rounded-xl px-3 py-2.5 min-h-[38px]">
          {prefix}{value || <span className="text-gray-300">—</span>}
        </p>
      )}
    </div>
  )
}

function ToggleSwitch({ on, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${on ? 'bg-cyan-500' : 'bg-gray-200'} ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}`}>
      <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-[20px]' : 'translate-x-0'}`} />
    </button>
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
  const { t, i18n } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [activeTab, setActiveTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [avail, setAvail] = useState(DEFAULT_AVAIL)
  const [editAvail, setEditAvail] = useState(DEFAULT_AVAIL)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [langSaved, setLangSaved] = useState(false)

  // About & Bio state
  const [bioForm, setBioForm] = useState(EMPTY_BIO_FORM)
  const [editingBio, setEditingBio] = useState(false)
  const [savingBio, setSavingBio] = useState(false)
  const [savedBio, setSavedBio] = useState(false)
  const [serviceInput, setServiceInput] = useState('')
  const [awardInput, setAwardInput] = useState('')

  // Qualifications state
  const [qualifications, setQualifications] = useState([])
  const [editingQual, setEditingQual] = useState(false)
  const [savingQual, setSavingQual] = useState(false)
  const [savedQual, setSavedQual] = useState(false)
  const [editQual, setEditQual] = useState([])

  // Stats state
  const [stats, setStats] = useState({ patients: 0, avgWait: 0, rating: 0, reviews: 0 })

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
        full_name: (normalized.full_name || '').replace(/^Dr\.?\s+/i, ''),
        phone: normalized.phone || '',
        email: normalized.email || '',
        specialization: normalized.specialization || '',
        consultation_fee: normalized.consultation_fee || 500,
        experience_years: normalized.experience_years || 0,
        clinic_name: normalized.clinic_name || '',
        license_number: normalized.license_number || '',
        time_per_patient: normalized.time_per_patient || 15,
        offers_in_clinic: normalized.offers_in_clinic !== false,
        offers_video: !!normalized.offers_video,
        offers_home_visit: !!normalized.offers_home_visit,
      })
      setBioForm({
        description: normalized.description || '',
        bio: normalized.bio || '',
        services: normalized.services || [],
        awards: normalized.awards || [],
      })
      const quals = normalized.qualifications
      const parsedQuals = Array.isArray(quals) ? quals : (quals ? JSON.parse(quals) : [])
      setQualifications(parsedQuals)
      setEditQual(JSON.parse(JSON.stringify(parsedQuals)))

      // Fetch stats
      const [{ count: patientCount }, { data: reviewData }, { data: apptData }] = await Promise.all([
        supabase.from('appointments').select('patient_id', { count: 'exact', head: true }).eq('doctor_id', user.id),
        supabase.from('reviews').select('rating').eq('doctor_id', user.id),
        supabase.from('appointments').select('duration_minutes').eq('doctor_id', user.id).eq('status', 'completed'),
      ])
      const avgRating = reviewData?.length ? (reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length).toFixed(1) : 0
      const avgWait = apptData?.length ? Math.round(apptData.reduce((s, a) => s + (a.duration_minutes || normalized.time_per_patient || 15), 0) / apptData.length) : (normalized.time_per_patient || 15)
      setStats({ patients: patientCount || 0, avgWait, rating: avgRating, reviews: reviewData?.length || 0 })

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

      const availRows = []
      for (const day of DAYS) {
        const d = editAvail[day]
        if (d.enabled && d.ranges?.length > 0) {
          const range = d.ranges[0]
          availRows.push({
            doctor_id: user.id,
            day_of_week: day,
            start_time: range.start,
            end_time: range.end,
            slot_duration: form.time_per_patient,
            is_available: true,
          })
        }
      }
      await supabase.from('doctor_availability').delete().eq('doctor_id', user.id)
      if (availRows.length > 0) {
        await supabase.from('doctor_availability').insert(availRows)
      }

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

  const handleSaveBio = async () => {
    setSavingBio(true)
    setError('')
    try {
      const { error } = await supabase
        .from('users')
        .update({
          description: bioForm.description || null,
          bio: bioForm.bio || null,
          services: bioForm.services.length ? bioForm.services : null,
          awards: bioForm.awards.length ? bioForm.awards : null,
        })
        .eq('id', user.id)
      if (error) throw error
      setEditingBio(false)
      setSavedBio(true)
      setTimeout(() => setSavedBio(false), 4000)
    } catch (e) { setError(e.message || 'Failed to save. Please try again.') }
    setSavingBio(false)
  }

  const handleSaveQual = async () => {
    setSavingQual(true)
    setError('')
    try {
      const { error } = await supabase
        .from('users')
        .update({ qualifications: editQual })
        .eq('id', user.id)
      if (error) throw error
      setQualifications(JSON.parse(JSON.stringify(editQual)))
      setEditingQual(false)
      setSavedQual(true)
      setTimeout(() => setSavedQual(false), 4000)
    } catch (e) { setError(e.message || 'Failed to save. Please try again.') }
    setSavingQual(false)
  }

  const addService = () => {
    const v = serviceInput.trim()
    if (!v || bioForm.services.includes(v)) return
    setBioForm(prev => ({ ...prev, services: [...prev.services, v] }))
    setServiceInput('')
  }
  const removeService = (s) => setBioForm(prev => ({ ...prev, services: prev.services.filter(x => x !== s) }))

  const addAward = () => {
    const v = awardInput.trim()
    if (!v) return
    setBioForm(prev => ({ ...prev, awards: [...prev.awards, v] }))
    setAwardInput('')
  }
  const removeAward = (idx) => setBioForm(prev => ({ ...prev, awards: prev.awards.filter((_, i) => i !== idx) }))

  const addQual = () => setEditQual(prev => [...prev, { ...EMPTY_QUAL }])
  const removeQual = (idx) => setEditQual(prev => prev.filter((_, i) => i !== idx))
  const updateQual = (idx, field, value) => setEditQual(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))

  const toggleDay = (day) => setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))
  const updateRange = (day, idx, field, value) => setEditAvail(prev => {
    const ranges = prev[day].ranges.map((r, i) => i === idx ? { ...r, [field]: value } : r)
    return { ...prev, [day]: { ...prev[day], ranges } }
  })
  const addRange = (day) => setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], ranges: [...prev[day].ranges, { start: '09:00', end: '17:00' }] } }))
  const removeRange = (day, idx) => setEditAvail(prev => ({ ...prev, [day]: { ...prev[day], ranges: prev[day].ranges.filter((_, i) => i !== idx) } }))

  const toggleConsultMode = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }))

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('mediinfo_lang', code)
    setLangSaved(true)
    setTimeout(() => setLangSaved(false), 2000)
  }

  const currentAvail = editing ? editAvail : avail
  const currentTpp = editing ? form.time_per_patient : (profile?.time_per_patient || 15)
  const displayName = profile?.full_name || user.full_name || 'Doctor'
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const TABS = [
    { id: 'profile', label: 'Profile' },
    { id: 'about', label: 'About & Bio' },
    { id: 'qualifications', label: 'Qualifications' },
    { id: 'language', label: t('profile.languageTab') },
  ]

  const showEditButton =
    (activeTab === 'profile' && !editing) ||
    (activeTab === 'about' && !editingBio) ||
    (activeTab === 'qualifications' && !editingQual)

  const showSaveCancel =
    (activeTab === 'profile' && editing) ||
    (activeTab === 'about' && editingBio) ||
    (activeTab === 'qualifications' && editingQual)

  const handleEditClick = () => {
    if (activeTab === 'profile') startEdit()
    else if (activeTab === 'about') setEditingBio(true)
    else if (activeTab === 'qualifications') { setEditQual(JSON.parse(JSON.stringify(qualifications))); setEditingQual(true) }
  }

  const handleCancelClick = () => {
    if (activeTab === 'profile') cancelEdit()
    else if (activeTab === 'about') { setBioForm({ description: profile?.description || '', bio: profile?.bio || '', services: profile?.services || [], awards: profile?.awards || [] }); setEditingBio(false) }
    else if (activeTab === 'qualifications') { setEditQual(JSON.parse(JSON.stringify(qualifications))); setEditingQual(false) }
  }

  const handleSaveClick = () => {
    if (activeTab === 'profile') handleSave()
    else if (activeTab === 'about') handleSaveBio()
    else if (activeTab === 'qualifications') handleSaveQual()
  }

  const isSaving = saving || savingBio || savingQual

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

            {(saved || savedBio || savedQual) && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                ✅ {saved ? 'Profile updated. Patients will see your new availability when booking.' : 'Changes saved successfully.'}
              </div>
            )}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <button onClick={() => navigate('/doctor-dashboard')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
              ← Back to dashboard
            </button>

            {/* Header card */}
            <div className="relative bg-gradient-to-br from-slate-50 to-blue-50/60 border border-gray-100 rounded-3xl p-6 mb-6 shadow-sm overflow-hidden">
              <div className="relative flex items-start gap-5">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">{initials}</div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-black text-gray-900">Dr. {displayName}</h1>
                  <p className="text-sm text-cyan-600 font-semibold">{profile?.specialization || 'General Physician'} · {profile?.experience_years || 0} yrs</p>
                  {profile?.clinic_name && <p className="text-sm text-gray-500 mt-0.5">{profile.clinic_name}</p>}

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-4 mt-4">
                    {[
                      { label: 'Patients', value: stats.patients },
                      { label: 'Rating', value: stats.rating > 0 ? `${stats.rating} ★` : '—' },
                      { label: 'Avg. wait', value: `${stats.avgWait} min` },
                      { label: 'Reviews', value: stats.reviews },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm min-w-[70px]">
                        <span className="text-base font-black text-gray-900">{value}</span>
                        <span className="text-xs text-gray-400 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Edit / Save / Cancel buttons — hidden on language tab */}
                {activeTab !== 'language' && (
                  <div className="shrink-0">
                    {showEditButton && (
                      <button onClick={handleEditClick} className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors">
                        Edit profile
                      </button>
                    )}
                    {showSaveCancel && (
                      <div className="flex gap-2">
                        <button onClick={handleCancelClick} className="border border-gray-200 bg-white text-gray-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSaveClick} disabled={isSaving} className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-60">
                          {isSaving ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {TABS.map(({ id, label }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? 'bg-cyan-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Profile tab */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                <div className="flex flex-col gap-5">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-black text-gray-800 mb-5">Basic information</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field icon="👤" label="Full name" field="full_name" value={profile?.full_name} editing={editing} form={form} setForm={setForm} prefix="Dr. " />
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
                    <h2 className="text-base font-black text-gray-800 mb-1">Consultation modes</h2>
                    <p className="text-xs text-gray-400 mb-4">Choose how patients can consult you. These are shown on your public profile.</p>
                    <div className="space-y-3">
                      {CONSULTATION_MODES.map(({ key, label, icon }) => {
                        const value = editing ? form[key] : (key === 'offers_in_clinic' ? profile?.[key] !== false : !!profile?.[key])
                        return (
                          <div key={key} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">{icon} {label}</span>
                            <ToggleSwitch on={value} disabled={!editing} onClick={() => toggleConsultMode(key)} />
                          </div>
                        )
                      })}
                    </div>
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
            )}

            {/* About & Bio tab */}
            {activeTab === 'about' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                {/* Short description + Bio */}
                <div className="flex flex-col gap-5">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-black text-gray-800 mb-1">Short description</h2>
                    <p className="text-xs text-gray-400 mb-4">Headline shown on your public profile.</p>
                    {editingBio ? (
                      <textarea rows={3} value={bioForm.description}
                        onChange={e => setBioForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="e.g. Compassionate cardiologist focused on preventive care and patient education."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none" />
                    ) : (
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5 min-h-[72px]">
                        {bioForm.description || <span className="text-gray-300">No description added yet.</span>}
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-black text-gray-800 mb-4">Biography</h2>
                    {editingBio ? (
                      <textarea rows={6} value={bioForm.bio}
                        onChange={e => setBioForm(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Write a detailed biography about your experience, specializations, research, etc."
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none" />
                    ) : (
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5 min-h-[120px] whitespace-pre-wrap">
                        {bioForm.bio || <span className="text-gray-300">No biography added yet.</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Services + Awards */}
                <div className="flex flex-col gap-5">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-black text-gray-800 mb-4">Services offered</h2>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {bioForm.services.map(s => (
                        <span key={s} className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-100 text-cyan-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                          {s}
                          {editingBio && (
                            <button onClick={() => removeService(s)} className="text-cyan-400 hover:text-red-500 transition-colors">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </span>
                      ))}
                      {bioForm.services.length === 0 && !editingBio && (
                        <span className="text-sm text-gray-300">No services added yet.</span>
                      )}
                    </div>
                    {editingBio && (
                      <div className="flex gap-2">
                        <input value={serviceInput} onChange={e => setServiceInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addService()}
                          placeholder="Add a service and press Enter"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                        <button onClick={addService} className="bg-cyan-500 hover:bg-cyan-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-base font-black text-gray-800 mb-4">Awards & recognition</h2>
                    <div className="space-y-2 mb-3">
                      {bioForm.awards.map((a, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                          <span className="text-cyan-500 text-base">🏆</span>
                          <span className="text-sm text-gray-800 flex-1">{a}</span>
                          {editingBio && (
                            <button onClick={() => removeAward(idx)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {bioForm.awards.length === 0 && !editingBio && (
                        <span className="text-sm text-gray-300">No awards added yet.</span>
                      )}
                    </div>
                    {editingBio && (
                      <div className="flex gap-2">
                        <input value={awardInput} onChange={e => setAwardInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addAward()}
                          placeholder="Add an award and press Enter"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                        <button onClick={addAward} className="bg-cyan-500 hover:bg-cyan-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Qualifications tab */}
            {activeTab === 'qualifications' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-3xl">
                <h2 className="text-base font-black text-gray-800 mb-5">Qualifications & education</h2>
                <div className="space-y-3">
                  {(editingQual ? editQual : qualifications).map((q, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="w-9 h-9 bg-cyan-500 rounded-full flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5 12.083 12.083 0 015.84 10.578L12 14z" /></svg>
                      </div>
                      {editingQual ? (
                        <>
                          <input value={q.degree} onChange={e => updateQual(idx, 'degree', e.target.value)}
                            placeholder="Degree (e.g. MBBS)"
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white" />
                          <input value={q.institution} onChange={e => updateQual(idx, 'institution', e.target.value)}
                            placeholder="Institution"
                            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white" />
                          <input value={q.year} onChange={e => updateQual(idx, 'year', e.target.value)}
                            placeholder="Year"
                            className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white" />
                          <button onClick={() => removeQual(idx)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-800">{q.degree}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-gray-600">{q.institution}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-sm text-gray-500">{q.year}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {qualifications.length === 0 && !editingQual && (
                    <p className="text-sm text-gray-300 px-2">No qualifications added yet.</p>
                  )}
                </div>
                {editingQual && (
                  <button onClick={addQual} className="mt-4 flex items-center gap-2 text-sm text-cyan-600 font-semibold hover:text-cyan-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                    Add qualification
                  </button>
                )}
              </div>
            )}

            {/* Language tab */}
            {activeTab === 'language' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl space-y-5">
                <div>
                  <h2 className="font-semibold text-gray-700 text-lg">{t('profile.languageTitle')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('profile.languageSubtitle')}</p>
                </div>
                {langSaved && (
                  <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                    ✅ {t('profile.languageSaved')}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {LANGUAGES.map(({ code, label }) => (
                    <button key={code} onClick={() => handleLanguageChange(code)}
                      className={`px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${i18n.language === code ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-cyan-300'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorProfile