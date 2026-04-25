import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { getReminders, createReminder, deleteReminder } from '../api/index'

function Reminders() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    medicine_name: '',
    dosage: '',
    frequency: 'daily',
    start_date: '',
    end_date: '',
    notes: ''
  })

  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    try {
      const res = await getReminders(user.id)
      setReminders(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.medicine_name || !form.start_date) return
    try {
      await createReminder({ ...form, user_id: user.id })
      setForm({ medicine_name: '', dosage: '', frequency: 'daily', start_date: '', end_date: '', notes: '' })
      setShowForm(false)
      fetchReminders()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id)
      setReminders(reminders.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const frequencyOptions = ['daily', 'twice daily', 'three times daily', 'weekly', 'as needed']

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="px-10 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">💊 My Reminders</h1>
              <p className="text-gray-500 mt-1">Manage your medication schedule</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-cyan-500 text-white px-5 py-2 rounded-xl hover:bg-cyan-600 font-medium"
            >
              {showForm ? 'Cancel' : '+ Add Reminder'}
            </button>
          </div>

          {/* Add Reminder Form */}
          {showForm && (
            <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">New Reminder</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Medicine Name *</label>
                  <input
                    type="text"
                    value={form.medicine_name}
                    onChange={e => setForm({ ...form, medicine_name: e.target.value })}
                    placeholder="e.g. Paracetamol"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Dosage</label>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={e => setForm({ ...form, dosage: e.target.value })}
                    placeholder="e.g. 500mg"
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Frequency</label>
                  <select
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    {frequencyOptions.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Start Date *</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={e => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={e => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-500 mb-1 block">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Take after meals"
                    rows={2}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  className="bg-cyan-500 text-white py-2 rounded-xl hover:bg-cyan-600 font-medium"
                >
                  Save Reminder
                </button>
              </div>
            </div>
          )}

          {/* Reminders List */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">⏰</p>
              <p className="text-gray-500 text-lg">No reminders yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Reminder" to get started</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-2xl">
              {reminders.map(r => (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-2xl">
                      💊
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{r.medicine_name}</h3>
                      {r.dosage && <p className="text-sm text-gray-500">Dosage: {r.dosage}</p>}
                      <p className="text-sm text-cyan-500 font-medium capitalize">{r.frequency}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {r.start_date} {r.end_date ? `→ ${r.end_date}` : ''}
                      </p>
                      {r.notes && <p className="text-sm text-gray-500 mt-1 italic">"{r.notes}"</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-red-400 hover:text-red-600 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reminders