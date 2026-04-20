import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function Profile() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = ['profile', 'security']

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-700'
      case 'pharmacist': return 'bg-purple-100 text-purple-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Profile Header Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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
              onClick={() => setActiveTab(tab)}
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
        <div className="bg-white rounded-2xl shadow-sm p-6">

          {activeTab === 'profile' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-700 text-lg">Account Information</h2>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Full Name</p>
                <p className="font-medium text-gray-800">{user.full_name}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                <p className="font-medium text-gray-800">{user.phone}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Role</p>
                <p className="font-medium text-gray-800 capitalize">{user.role}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">User ID</p>
                <p className="font-medium text-gray-800 text-sm">{user.id}</p>
              </div>

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
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <h2 className="font-semibold text-gray-700 text-lg">Security</h2>

              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Password</p>
                  <p className="text-sm text-gray-500">Last changed: unknown</p>
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
        <div className="grid grid-cols-3 gap-4 mt-6">
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
  )
}

export default Profile