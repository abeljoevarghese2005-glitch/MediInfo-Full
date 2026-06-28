import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

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

function Profile() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'))
  const [activeTab, setActiveTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ full_name: user.full_name, phone: user.phone })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [langSaved, setLangSaved] = useState(false)

  const tabs = ['profile', 'security', 'language']

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data, error: updateError } = await supabase
        .from('users')
        .update({ full_name: form.full_name, phone: form.phone })
        .eq('id', user.id)
        .select()
        .single()
      if (updateError) throw updateError
      const updatedUser = { ...user, ...data }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      setUser(updatedUser)
      setEditing(false)
      setSuccess(t('profile.profileUpdated'))
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || t('profile.failedUpdate'))
    }
    setSaving(false)
  }

  const handleLanguageChange = (code) => {
    i18n.changeLanguage(code)
    localStorage.setItem('mediinfo_lang', code)
    setLangSaved(true)
    setTimeout(() => setLangSaved(false), 2000)
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'doctor': return 'bg-blue-100 text-blue-700'
      case 'pharmacist': return 'bg-purple-100 text-purple-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* ── Gradient Hero Banner (with user identity) ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-3xl mb-6">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-white text-3xl font-semibold shrink-0">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">{user.full_name}</h1>
                <p className="text-cyan-100 text-sm mt-0.5">{user.phone}</p>
                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium capitalize bg-white/20 text-white`}>
                  {t(`profile.roles.${user.role}`, user.role)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 sm:px-8 py-6 max-w-5xl w-full">

            {/* ── Tabs ── */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setEditing(false); setError(''); setSuccess('') }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    activeTab === tab
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                      : 'bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'language' ? t('profile.languageTab') : tab === 'security' ? t('profile.security') : t('profile.profileTab')}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div className="bg-white rounded-2xl shadow-sm p-6 max-w-2xl">

              {activeTab === 'profile' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold tracking-tight text-gray-700 text-lg">{t('profile.title')}</h2>
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="text-emerald-600 hover:text-emerald-500 text-sm font-medium border border-emerald-300 px-3 py-1 rounded-lg transition-colors hover:bg-emerald-50"
                      >
                        ✏️ {t('common.edit')}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditing(false); setForm({ full_name: user.full_name, phone: user.phone }); setError('') }}
                        className="text-gray-500 hover:text-gray-600 text-sm font-medium border border-gray-300 px-3 py-1 rounded-lg"
                      >
                        {t('common.cancel')}
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
                    <p className="text-xs text-gray-500 mb-1">{t('profile.fullName')}</p>
                    {editing ? (
                      <input
                        type="text"
                        value={form.full_name}
                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{user.full_name}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('profile.phone')}</p>
                    {editing ? (
                      <input
                        type="text"
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="w-full bg-white px-3 py-2 rounded-lg border border-gray-200 text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 hover:border-emerald-300"
                      />
                    ) : (
                      <p className="font-medium text-gray-800">{user.phone}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('profile.role')}</p>
                    <p className="font-medium text-gray-800 capitalize">{t(`profile.roles.${user.role}`, user.role)}</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">{t('profile.userId')}</p>
                    <p className="font-medium text-gray-800 text-sm">{user.id}</p>
                  </div>

                  {editing && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="w-full bg-emerald-700 text-white py-3 rounded-xl font-bold tracking-tight transition-colors hover:bg-emerald-500"
                    >
                      {saving ? t('common.saving') : t('common.save')}
                    </button>
                  )}

                  {!editing && (
                    <div className="pt-2 flex gap-3">
                      <button
                        onClick={() => navigate('/reminders')}
                        className="flex-1 bg-green-50 text-emerald-700 py-2 rounded-xl font-medium text-sm transition-colors hover:bg-green-100 hover:text-emerald-600"
                      >
                        ⏰ {t('profile.myReminders')}
                      </button>
                      <button
                        onClick={() => navigate('/ai-chat')}
                        className="flex-1 bg-green-50 text-emerald-700 py-2 rounded-xl font-medium text-sm transition-colors hover:bg-green-100 hover:text-emerald-600"
                      >
                        🤖 {t('profile.aiChat')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-5">
                  <h2 className="font-semibold tracking-tight text-gray-700 text-lg">{t('profile.security')}</h2>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{t('profile.password')}</p>
                      <p className="text-sm text-gray-500">{t('profile.passwordManaged')}</p>
                    </div>
                    <span className="text-gray-400 text-sm">••••••••</span>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{t('profile.phone')}</p>
                      <p className="text-sm text-gray-500">{t('profile.phoneLogin')}</p>
                    </div>
                    <span className="text-gray-600 text-sm">{user.phone}</span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-700">
                      🔒 {t('profile.accountSecured')}
                    </p>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 font-medium"
                  >
                    {t('common.logout')}
                  </button>
                </div>
              )}

              {activeTab === 'language' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="font-semibold tracking-tight text-gray-700 text-lg">{t('profile.languageTitle')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('profile.languageSubtitle')}</p>
                  </div>

                  {langSaved && (
                    <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                      ✅ {t('profile.languageSaved')}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {LANGUAGES.map(({ code, label }) => (
                      <button
                        key={code}
                        onClick={() => handleLanguageChange(code)}
                        className={`px-4 py-3 rounded-xl text-sm font-medium border transition-colors ${
                          i18n.language === code
                            ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Quick Stats ── */}
            <div className="grid grid-cols-3 gap-4 mt-6 max-w-2xl">
              <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-600">💊</p>
                <p className="text-xs text-gray-500 mt-1">{t('profile.medicines')}</p>
                <p className="font-semibold tracking-tight text-gray-800">100+</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-600">🤖</p>
                <p className="text-xs text-gray-500 mt-1">{t('profile.aiPowered')}</p>
                <p className="font-semibold tracking-tight text-gray-800">Gemini</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
                <p className="text-2xl font-semibold text-emerald-600">🇮🇳</p>
                <p className="text-xs text-gray-500 mt-1">{t('profile.madeFor')}</p>
                <p className="font-semibold tracking-tight text-gray-800">{t('profile.india')}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Profile