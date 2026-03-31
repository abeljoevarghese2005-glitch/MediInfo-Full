import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

const suggestions = ['Paracetamol', 'Aspirin', 'Metformin', 'Amoxicillin', 'Ibuprofen']

function Landing() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${query}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-50 text-cyan-600 px-4 py-2 rounded-full text-sm font-medium mb-8">
          ✦ AI-Powered Pharmaceutical Intelligence
        </div>

        <h1 className="text-5xl font-bold text-gray-800 mb-4 leading-tight">
          Understand Your Medicines <br />
          <span className="text-cyan-500">with Confidence</span>
        </h1>

        <p className="text-gray-500 text-lg mb-10">
          Search, learn, and stay safe. Get AI-powered medicine information
          in simple language, made for India.
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by medicine name, brand or generic name..."
              className="flex-1 px-5 py-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-gray-700 shadow-sm"
            />
            <button
              type="submit"
              className="bg-cyan-500 text-white px-8 py-4 rounded-xl hover:bg-cyan-600 font-medium shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mb-16">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => navigate(`/search?q=${s}`)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-500 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-4">
              <span className="text-cyan-500 text-xl">🔍</span>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Medicine Search</h3>
            <p className="text-gray-500 text-sm">
              Search any medicine by brand name, generic name, or composition instantly.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-4">
              <span className="text-cyan-500 text-xl">🤖</span>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">AI Explanations</h3>
            <p className="text-gray-500 text-sm">
              Get simple, easy-to-understand explanations of your medicines powered by AI.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mb-4">
              <span className="text-cyan-500 text-xl">⚠️</span>
            </div>
            <h3 className="font-bold text-gray-800 mb-2">Safety Alerts</h3>
            <p className="text-gray-500 text-sm">
              Know about drug interactions, side effects, and important warnings.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 border-t border-amber-200 px-6 py-4 text-center text-sm text-amber-700">
        ⚠️ For educational purposes only. Always consult a licensed healthcare professional.
      </div>
    </div>
  )
}

export default Landing