import { useState, useEffect, useRef } from 'react'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { getReminders, createReminder, deleteReminder, getMyAppointments } from '../api/index'

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

function StatusBadge({ active }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'}`}>
      {active ? '● Active' : '● Expired'}
    </span>
  )
}

function Reminders() {
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const [tab, setTab] = useState('medicine')
  const [reminders, setReminders] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [takenToday, setTakenToday] = useState(() => {
    try { return JSON.parse(localStorage.getItem('takenToday') || '{}') } catch { return {} }
  })
  const [notifPermission, setNotifPermission] = useState(Notification.permission)
  const notifTimers = useRef([])

  const [form, setForm] = useState({
    medicine_name: '', dosage: '', frequency: 'daily',
    reminder_time: '08:00', start_date: '', end_date: '', notes: ''
  })

  useEffect(() => {
    fetchReminders()
    fetchAppointments()
    return () => notifTimers.current.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (notifPermission === 'granted') scheduleNotifications()
  }, [reminders, notifPermission])

  const fetchReminders = async () => {
    try {
      const res = await getReminders(user.id)
      setReminders(res.data)
    } catch { setReminders([]) }
    finally { setLoading(false) }
  }

  const fetchAppointments = async () => {
    try {
      const res = await getMyAppointments(user.id)
      const upcoming = res.data.filter(a => a.appointment_date >= new Date().toISOString().split('T')[0])
      setAppointments(upcoming)
    } catch { setAppointments([]) }
  }

  const requestNotifPermission = async () => {
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  const scheduleNotifications = () => {
    notifTimers.current.forEach(clearTimeout)
    notifTimers.current = []
    const now = new Date()
    reminders.filter(isActive).forEach(r => {
      if (!r.reminder_time) return
      const [h, m] = r.reminder_time.split(':').map(Number)
      const target = new Date()
      target.setHours(h, m, 0, 0)
      const diff = target - now
      if (diff > 0 && diff < 86400000) {
        const t = setTimeout(() => {
          new Notification(`💊 Time for ${r.medicine_name}`, {
            body: `${r.dosage ? r.dosage + ' · ' : ''}${r.frequency}${r.notes ? '\n' + r.notes : ''}`,
            icon: '/favicon.ico'
          })
        }, diff)
        notifTimers.current.push(t)
      }
    })
  }

  const handleSubmit = async () => {
    if (!form.medicine_name || !form.start_date) return
    try {
      await createReminder({ ...form, user_id: user.id })
      setForm({ medicine_name:'', dosage:'', frequency:'daily', reminder_time:'08:00', start_date:'', end_date:'', notes:'' })
      setShowForm(false)
      fetchReminders()
    } catch(err) { console.error(err) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id)
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

  const formatTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
    return `${hour}:${m.toString().padStart(2,'0')} ${suffix}`
  }

  const activeCount = reminders.filter(isActive).length
  const takenCount = reminders.filter(r => isTakenToday(r.id)).length

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />
          <div className="px-4 sm:px-8 py-8 max-w-4xl">

            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900">Reminders</h1>
                <p className="text-gray-400 text-sm mt-0.5">Stay on top of your medications & appointments</p>
              </div>
              {tab === 'medicine' && (
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="bg-cyan-500 text-white px-4 py-2 rounded-xl hover:bg-cyan-600 font-semibold text-sm shrink-0"
                >
                  {showForm ? 'Cancel' : '+ Add'}
                </button>
              )}
            </div>

            {/* Notification banner */}
            {notifPermission === 'default' && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Enable notifications</p>
                    <p className="text-xs text-amber-600">Get alerted when it's time to take your medicine</p>
                  </div>
                </div>
                <button
                  onClick={requestNotifPermission}
                  className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-600 shrink-0"
                >
                  Enable
                </button>
              </div>
            )}

            {notifPermission === 'granted' && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5 mb-5 flex items-center gap-2 text-sm text-green-700">
                <span>✅</span> Browser notifications are enabled
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-cyan-500">{reminders.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-green-500">{activeCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Active</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-2xl font-black text-purple-500">{takenCount}</p>
                <p className="text-xs text-gray-400 mt-0.5">Taken Today</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {['medicine', 'appointments'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${
                    tab === t ? 'bg-cyan-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  {t === 'medicine' ? '💊 Medicine' : '📅 Appointments'}
                </button>
              ))}
            </div>

            {/* Add Form */}
            {tab === 'medicine' && showForm && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
                <h2 className="text-base font-bold text-gray-800 mb-4">New Medicine Reminder</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Medicine Name *</label>
                    <input
                      type="text"
                      value={form.medicine_name}
                      onChange={e => setForm({...form, medicine_name: e.target.value})}
                      placeholder="e.g. Paracetamol"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Dosage</label>
                    <input
                      type="text"
                      value={form.dosage}
                      onChange={e => setForm({...form, dosage: e.target.value})}
                      placeholder="e.g. 500mg"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Reminder Time</label>
                    <input
                      type="time"
                      value={form.reminder_time}
                      onChange={e => setForm({...form, reminder_time: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Frequency</label>
                    <select
                      value={form.frequency}
                      onChange={e => setForm({...form, frequency: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    >
                      {frequencyOptions.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Start Date *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({...form, start_date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({...form, end_date: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm({...form, notes: e.target.value})}
                      placeholder="e.g. Take after meals"
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm resize-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      onClick={handleSubmit}
                      className="w-full bg-cyan-500 text-white py-2.5 rounded-xl hover:bg-cyan-600 font-semibold text-sm"
                    >
                      Save Reminder
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Medicine Tab */}
            {tab === 'medicine' && (
              <>
                {loading ? (
                  <div className="text-center py-12 text-gray-400">Loading...</div>
                ) : reminders.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <p className="text-5xl mb-3">💊</p>
                    <p className="text-gray-500 font-medium">No reminders yet</p>
                    <p className="text-gray-400 text-sm mt-1">Click "+ Add" to get started</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {reminders.map(r => {
                      const active = isActive(r)
                      const taken = isTakenToday(r.id)
                      return (
                        <div
                          key={r.id}
                          className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all ${
                            taken ? 'border-green-200 opacity-75' : active ? 'border-gray-100' : 'border-gray-100 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3 flex-1 min-w-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${taken ? 'bg-green-50' : 'bg-cyan-50'}`}>
                                {taken ? '✅' : '💊'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h3 className={`font-bold text-gray-900 ${taken ? 'line-through text-gray-400' : ''}`}>
                                    {r.medicine_name}
                                  </h3>
                                  <StatusBadge active={active} />
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                                  {r.dosage && <span>💉 {r.dosage}</span>}
                                  <span className="text-cyan-500 font-medium capitalize">🔁 {r.frequency}</span>
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
                                <button
                                  onClick={() => toggleTaken(r.id)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                                    taken
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-500 hover:bg-cyan-50 hover:text-cyan-600'
                                  }`}
                                >
                                  {taken ? 'Taken ✓' : 'Mark Taken'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(r.id)}
                                className="text-xs text-red-400 hover:text-red-600 font-medium"
                              >
                                Delete
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

            {/* Appointments Tab */}
            {tab === 'appointments' && (
              <>
                {appointments.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <p className="text-5xl mb-3">📅</p>
                    <p className="text-gray-500 font-medium">No upcoming appointments</p>
                    <p className="text-gray-400 text-sm mt-1">Book a doctor to see reminders here</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {appointments.map(a => {
                      const isToday = a.appointment_date === new Date().toISOString().split('T')[0]
                      const isTomorrow = a.appointment_date === new Date(Date.now()+86400000).toISOString().split('T')[0]
                      const label = isToday ? '🔴 Today' : isTomorrow ? '🟡 Tomorrow' : '🟢 Upcoming'
                      return (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 ${getColor(a.doctor_name)} rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                              {getInitials(a.doctor_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                <p className="font-bold text-gray-900 text-sm">Dr. {a.doctor_name}</p>
                                <span className="text-xs font-semibold">{label}</span>
                              </div>
                              <p className="text-cyan-500 text-xs">{a.specialization || 'General Physician'}</p>
                              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                                <span>📅 {formatDate(a.appointment_date)}</span>
                                {a.appointment_time && <span>⏰ {a.appointment_time}</span>}
                              </div>
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