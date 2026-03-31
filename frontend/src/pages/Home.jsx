import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getAllMedicines } from '../api'

const suggestions = ['Paracetamol', 'Aspirin', 'Metformin', 'Amoxicillin', 'Ibuprofen']

function Home() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${query}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome to MediInfo
        </h1>
        <p className="text-gray-500 mb-8">
          Search for any medicine to get detailed information
        </p>

        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by medicine name..."
            className="flex-1 px-5 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            type="submit"
            className="bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => navigate(`/search?q=${s}`)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-500"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home