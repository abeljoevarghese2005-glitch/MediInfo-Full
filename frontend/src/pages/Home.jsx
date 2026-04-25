import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'

const suggestions = ['Paracetamol', 'Aspirin', 'Metformin', 'Amoxicillin', 'Ibuprofen', 'Cetirizine']

function Home() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${query}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      <Sidebar />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar />

        {/* Hero section */}
        <div className="flex-1 px-10 py-12">
          <p className="text-cyan-500 text-sm font-medium mb-4 flex items-center gap-2">
            ✨ Welcome back, {user.full_name}
          </p>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-4">
            Understand your medicines<br />
            with <span className="text-cyan-500">confidence.</span>
          </h1>

          <p className="text-gray-500 text-lg mb-10">
            Search any medicine, or book a verified doctor<br />
            — all in one quiet, focused place.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-3 mb-6 max-w-2xl">
            <div className="flex-1 flex items-center bg-white border border-gray-200 rounded-xl px-4 gap-2 shadow-sm">
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try 'Paracetamol', 'Azithromycin', or paste a composition..."
                className="flex-1 py-4 focus:outline-none text-gray-700 bg-transparent text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-cyan-500 text-white px-6 py-4 rounded-xl hover:bg-cyan-600 font-medium flex items-center gap-2"
            >
              Search →
            </button>
          </form>

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2 mb-10">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => navigate(`/search?q=${s}`)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-500 shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 mb-14">
            <button
              onClick={() => navigate('/doctors')}
              className="flex items-center gap-2 bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 font-medium"
            >
              🩺 Book a doctor
            </button>
            <button
              onClick={() => navigate('/ai-chat')}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:border-cyan-400 hover:text-cyan-500 font-medium shadow-sm"
            >
              🤖 Ask AI
            </button>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-cyan-500 text-xl">🔍</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Medicine Search</h3>
              <p className="text-gray-500 text-sm">Find any medicine by brand, generic name, or composition.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-cyan-500 text-xl">🤖</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">AI Explanations</h3>
              <p className="text-gray-500 text-sm">Plain-language summaries of what each medicine actually does.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center mb-4">
                <span className="text-cyan-500 text-xl">🛡️</span>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Safety First</h3>
              <p className="text-gray-500 text-sm">Interactions, side effects and warnings — surfaced upfront.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home