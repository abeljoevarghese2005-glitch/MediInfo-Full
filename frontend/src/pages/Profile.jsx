import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import { updateUser } from '../api/index'

function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('user') || '{}'))
  const [activeTab, setActiveTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const tabs = ['profile', 'security']

  const handleLogout = () => {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    navigate('/')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await updateUser(user.id, form)
      const updatedUser = { ...user, ...res.data }
      sessionStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      setEditing(false)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile')
    }
    setSaving(false)
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-700'
      case 'pharmacist': return 'bg-purple-100 text-purple-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="px-10 py-8">

          {/* Profile Header Card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 max-w-2xl">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-cyan-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{user.full_name}</h1>
                <p className="text-gray-500 mt-1">{user.phone}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleColor(user.role)}`}>
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setEditing(false); setError(''); setSuccess('') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                  activeTab === tab
                    ? 'bg-cyan-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">

            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-700 text-lg">Account Information</h2>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-cyan-500 hover:text-cyan-600 text-sm font-medium border border-cyan-300 px-3 py-1 rounded-lg"
                    >
                      ✏️ Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditing(false); setForm({ full_name: user.full_name, phone: user.phone }); setError('') }}
                      className="text-gray-500 hover:text-gray-600 text-sm font-medium border border-gray-300 px-3 py-1 rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {success && (
                  <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                    ✅ {success}
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                    ❌ {error}
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Full Name</p>
                  {editing ? (
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={e => setForm({ ...form, full_name: e.target.value })}
                      className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800"
                    />
                  ) : (
                    <p className="font-medium text-gray-800">{user.full_name}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                  {editing ? (
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-800"
                    />
                  ) : (
                    <p className="font-medium text-gray-800">{user.phone}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <p className="font-medium text-gray-800 capitalize">{user.role}</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">User ID</p>
                  <p className="font-medium text-gray-800 text-sm">{user.id}</p>
                </div>

                {editing && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-cyan-500 text-white py-3 rounded-xl hover:bg-cyan-600 font-medium"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}

                {!editing && (
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => navigate('/reminders')}
                      className="flex-1 bg-cyan-50 text-cyan-600 py-2 rounded-xl hover:bg-cyan-100 font-medium text-sm"
                    >
                      ⏰ My Reminders
                    </button>
                    <button
                      onClick={() => navigate('/ai-chat')}
                      className="flex-1 bg-cyan-50 text-cyan-600 py-2 rounded-xl hover:bg-cyan-100 font-medium text-sm"
                    >
                      🤖 AI Chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-5">
                <h2 className="font-semibold text-gray-700 text-lg">Security</h2>

                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Password</p>
                    <p className="text-sm text-gray-500">Secured with bcrypt</p>
                  </div>
                  <span className="text-gray-400 text-sm">••••••••</span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">Phone Number</p>
                    <p className="text-sm text-gray-500">Used for login</p>
                  </div>
                  <span className="text-gray-600 text-sm">{user.phone}</span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-700">
                    🔒 Your account is secured with bcrypt password hashing and JWT authentication.
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 font-medium"
                >
                  Logout from all devices
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-2xl">
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-cyan-500">💊</p>
              <p className="text-xs text-gray-500 mt-1">Medicines</p>
              <p className="font-bold text-gray-800">100+</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-cyan-500">🤖</p>
              <p className="text-xs text-gray-500 mt-1">AI Powered</p>
              <p className="font-bold text-gray-800">Gemini</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-cyan-500">🇮🇳</p>
              <p className="text-xs text-gray-500 mt-1">Made for</p>
              <p className="font-bold text-gray-800">India</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile