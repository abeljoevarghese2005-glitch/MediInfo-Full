import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'
import { translateSpecialization } from '../utils/specializations'
import {
  scheduleReminderNotifications,
  cancelReminderNotifications,
  scheduleAppointmentNotifications,
  checkNotifPermission,
  requestNotifPermission,
} from '../hooks/useLocalNotifications'

// Stored DB value -> i18next key under reminders.frequencies.*
const FREQUENCY_KEY_BY_VALUE = {
  'daily': 'daily',
  'twice daily': 'twiceDaily',
  'three times daily': 'threeTimesDaily',
  'weekly': 'weekly',
  'as needed': 'asNeeded',
}
const frequencyOptions = ['daily', 'twice daily', 'three times daily', 'weekly', 'as needed']

const avatarColors = ['bg-cyan-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0)||0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'D'

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
}

function isActive(r) {
  const today = new Date().toISOString().split('T')[0]
  if (r.end_date && r.end_date < today) return false
  return true
}

function StatusBadge({ active, t }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'}`}>
      {active ? `● ${t('reminders.status.active')}` : `● ${t('reminders.status.expired')}`}
    </span>
  )
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2,'0')} ${suffix}`
}

function Reminders() {
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [tab, setTab] = useState('medicine')
  const [reminders, setReminders] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [notifPermission, setNotifPermission] = useState('prompt')
  const [takenToday, setTakenToday] = useState(() => {
    try { return JSON.parse(localStorage.getItem('takenToday') || '{}') } catch { return {} }
  })

  const [form, setForm] = useState({
    medicine_name: '', dosage: '', frequency: 'daily',
    reminder_time: '08:00', start_date: '', end_date: '', notes: ''
  })

  useEffect(() => {
    fetchReminders()
    fetchAppointments()
    handleCheckNotifPermission()
  }, [])

  useEffect(() => {
    appointments.forEach(a => {
      if (a.status === 'confirmed') {
        scheduleAppointmentNotifications(a)
      }
    })
  }, [appointments])

  const handleCheckNotifPermission = async () => {
    const status = await checkNotifPermission()
    setNotifPermission(status)
  }

  const handleRequestPermission = async () => {
    const granted = await requestNotifPermission()
    setNotifPermission(granted ? 'granted' : 'denied')
  }

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setReminders(data || [])
    } catch { setReminders([]) }
    finally { setLoading(false) }
  }

  const fetchAppointments = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('appointments')
        .select('*, users!appointments_doctor_id_fkey(full_name, specialization)')
        .eq('patient_id', user.id)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
      if (error) throw error
      const formatted = (data || []).map(a => ({
        ...a,
        doctor_name: a.users?.full_name,
        specialization: a.users?.specialization
      }))
      setAppointments(formatted)
    } catch { setAppointments([]) }
  }

  const handleSubmit = async () => {
    if (!form.medicine_name || !form.start_date) return
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .insert({
          user_id: user.id,
          medicine_name: form.medicine_name,
          dosage: form.dosage || null,
          frequency: form.frequency,
          reminder_time: form.reminder_time || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          notes: form.notes || null,
        })
        .select()
        .single()

      if (error) throw error

      await scheduleReminderNotifications(data)

      setForm({ medicine_name:'', dosage:'', frequency:'daily', reminder_time:'08:00', start_date:'', end_date:'', notes:'' })
      setShowForm(false)
      fetchReminders()
    } catch(err) {
      alert(t('reminders.errorPrefix') + ': ' + JSON.stringify(err))
    }
  }

  const handleDelete = async (id) => {
    try {
      await cancelReminderNotifications(id)
      const { error } = await supabase
        .from('medication_reminders')
        .delete()
        .eq('id', id)
      if (error) throw error
      setReminders(reminders.filter(r => r.id !== id))
    } catch(err) { console.error(err) }
  }

  const toggleTaken = (id) => {
    const today = new Date().toISOString().split('T')[0]
    const key = `${id}_${today}`
    const updated = { ...takenToday, [key]: !takenToday[key] }
    setTakenToday(updated)
    localStorage.setItem('takenToday', JSON.stringify(updated))
  }

  const isTakenToday = (id) => {
    const today = new Date().toISOString().split('T')[0]
    return !!takenToday[`${id}_${today}`]
  }

  const activeCount = reminders.filter(isActive).length
  const takenCount = reminders.filter(r => isTakenToday(r.id)).length

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-b-3xl mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">{t('reminders.title')}</h1>
                <p className="text-cyan-100 text-sm mt-1">{t('reminders.subtitle')}</p>
              </div>
              {tab === 'medicine' && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl font-semibold tracking-tight text-sm shrink-0 backdrop-blur-sm transition-all"
                >
                  {showForm ? t('common.cancel') : `+ ${t('reminders.add')}`}
                </button>
              )}
            </div>

            {/* Stats row inside hero */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center transition-colors hover:bg-white/30">
                <p className="text-2xl font-semibold tracking-tight text-white">{reminders.length}</p>
                <p className="text-xs text-cyan-100 mt-0.5">{t('reminders.stats.total')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center transition-colors hover:bg-white/30">
                <p className="text-2xl font-semibold tracking-tight text-white">{activeCount}</p>
                <p className="text-xs text-cyan-100 mt-0.5">{t('reminders.stats.active')}</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 text-center transition-colors hover:bg-white/30">
                <p className="text-2xl font-semibold tracking-tight text-white">{takenCount}</p>
                <p className="text-xs text-cyan-100 mt-0.5">{t('reminders.stats.takenToday')}</p>
              </div>
            </div>
          </div>

          {/* ── Page content ── */}
          <div className="flex-1 px-4 sm:px-8 pb-8 max-w-4xl w-full">

            {/* Notification permission banner */}
            {notifPermission !== 'granted' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔔</span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-amber-800">{t('reminders.notifBanner.title')}</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      {notifPermission === 'denied'
                        ? t('reminders.notifBanner.blocked')
                        : t('reminders.notifBanner.prompt')}
                    </p>
                  </div>
                </div>
                {notifPermission !== 'denied' && (
                  <button
                    onClick={handleRequestPermission}
                    className="bg-amber-500 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-amber-600 shrink-0"
                  >
                    {t('reminders.notifBanner.allow')}
                  </button>
                )}
              </div>
            )}

            {notifPermission === 'granted' && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-5 flex items-center gap-2 text-sm text-green-700">
                <span>✅</span>
                <span className="font-medium">{t('reminders.notifBanner.activeTitle')}</span>
                <span className="text-green-500 text-xs">— {t('reminders.notifBanner.activeSub')}</span>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {['medicine', 'appointments'].map(tabKey => (
                <button
                  key={tabKey}
                  onClick={() => setTab(tabKey)}
                  className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                    tab === tabKey
                      ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-500'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                  }`}
                >
                  {tabKey === 'medicine' ? `💊 ${t('reminders.tabs.medicine')}` : `📅 ${t('reminders.tabs.appointments')}`}
                </button>
              ))}
            </div>

            {/* Add reminder form */}
            {tab === 'medicine' && showForm && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <h2 className="text-base font-semibold tracking-tight text-gray-800 mb-4">{t('reminders.form.newTitle')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.medicineName')} *</label>
                    <input type="text" value={form.medicine_name}
                      onChange={e => setForm({...form, medicine_name: e.target.value})}
                      placeholder={t('reminders.form.medicineNamePlaceholder')}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.dosage')}</label>
                    <input type="text" value={form.dosage}
                      onChange={e => setForm({...form, dosage: e.target.value})}
                      placeholder={t('reminders.form.dosagePlaceholder')}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.reminderTime')} ⏰</label>
                    <input type="time" value={form.reminder_time}
                      onChange={e => setForm({...form, reminder_time: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.frequency')}</label>
                    <select value={form.frequency}
                      onChange={e => setForm({...form, frequency: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300">
                      {frequencyOptions.map(f => (
                        <option key={f} value={f}>
                          {t(`reminders.frequencies.${FREQUENCY_KEY_BY_VALUE[f]}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.startDate')} *</label>
                    <input type="date" value={form.start_date}
                      onChange={e => setForm({...form, start_date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.endDate')}</label>
                    <input type="date" value={form.end_date}
                      onChange={e => setForm({...form, end_date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-500 mb-1 block">{t('reminders.form.notes')}</label>
                    <textarea value={form.notes}
                      onChange={e => setForm({...form, notes: e.target.value})}
                      placeholder={t('reminders.form.notesPlaceholder')} rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300 hover:bg-emerald-50/40" />
                  </div>
                  <div className="sm:col-span-2">
                    <button onClick={handleSubmit}
                      className="w-full bg-emerald-700 text-white py-2.5 rounded-xl font-bold tracking-tight text-sm transition-colors hover:bg-emerald-500">
                      {t('reminders.form.save')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Medicine tab content */}
            {tab === 'medicine' && (
              <>
                {loading ? (
                  <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
                ) : reminders.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <p className="text-5xl mb-3">💊</p>
                    <p className="text-gray-500 font-medium">{t('reminders.empty.title')}</p>
                    <p className="text-gray-400 text-sm mt-1">{t('reminders.empty.subtitle')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reminders.map(r => {
                      const active = isActive(r)
                      const taken = isTakenToday(r.id)
                      return (
                        <div key={r.id} className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all ${taken ? 'border-green-200 opacity-75' : active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3 flex-1 min-w-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 bg-green-50`}>
                                {taken ? '✅' : '💊'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className={`font-semibold tracking-tight text-gray-900 ${taken ? 'line-through text-gray-400' : ''}`}>{r.medicine_name}</h3>
                                  <StatusBadge active={active} t={t} />
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                  {r.dosage && <span>💉 {r.dosage}</span>}
                                  <span className="text-emerald-600 font-medium capitalize">
                                    🔁 {FREQUENCY_KEY_BY_VALUE[r.frequency] ? t(`reminders.frequencies.${FREQUENCY_KEY_BY_VALUE[r.frequency]}`) : r.frequency}
                                  </span>
                                  {r.reminder_time && <span>⏰ {formatTime(r.reminder_time)}</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  {formatDate(r.start_date)}{r.end_date ? ` → ${formatDate(r.end_date)}` : ''}
                                </p>
                                {r.notes && <p className="text-xs text-gray-400 italic mt-1">"{r.notes}"</p>}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end shrink-0">
                              {active && (
                                <button onClick={() => toggleTaken(r.id)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${taken ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                                  {taken ? `${t('reminders.taken')} ✓` : t('reminders.markTaken')}
                                </button>
                              )}
                              <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600 font-medium">
                                {t('reminders.delete')}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Appointments tab content */}
            {tab === 'appointments' && (
              <>
                {appointments.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <p className="text-5xl mb-3">📅</p>
                    <p className="text-gray-500 font-medium">{t('reminders.appointments.emptyTitle')}</p>
                    <p className="text-gray-400 text-sm mt-1">{t('reminders.appointments.emptySubtitle')}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {appointments.map(a => {
                      const isToday = a.appointment_date === new Date().toISOString().split('T')[0]
                      const isTomorrow = a.appointment_date === new Date(Date.now()+86400000).toISOString().split('T')[0]
                      const label = isToday ? `🔴 ${t('common.today')}` : isTomorrow ? `🟡 ${t('common.tomorrow')}` : `🟢 ${t('reminders.appointments.upcoming')}`
                      return (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${getColor(a.doctor_name)} rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0`}>
                              {getInitials(a.doctor_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <p className="font-semibold tracking-tight text-gray-900 text-sm">Dr. {a.doctor_name}</p>
                                <span className="text-xs font-medium">{label}</span>
                              </div>
                              <p className="text-emerald-600 text-xs font-medium">{translateSpecialization(t, a.specialization)}</p>
                              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                                <span>📅 {formatDate(a.appointment_date)}</span>
                                {a.appointment_time && <span>⏰ {formatTime(a.appointment_time)}</span>}
                              </div>
                              {a.status === 'confirmed' && (
                                <span className="inline-block mt-1 text-xs bg-green-100 text-green-600 font-medium px-2 py-0.5 rounded-full">
                                  ✓ {t('reminders.appointments.reminderSet')}
                                </span>
                              )}
                              {a.issue && <p className="text-xs text-gray-400 italic mt-1">"{a.issue}"</p>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Reminders