import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'
import MedicineCard from '../components/MedicineCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { searchMedicines } from '../api'

function SearchResults() {
  const [searchParams] = useSearchParams()
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = searchParams.get('q')

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await searchMedicines(query)
        setResults(res.data)
      } catch {
        setError('No medicines found')
      }
      setLoading(false)
    }
    if (query) fetch()
  }, [query])

  return (
    <SidebarProvider>
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="lg:ml-56 flex-1 flex flex-col">
        <TopBar />
        <div className="px-10 py-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Search Results
          </h2>
          <p className="text-gray-500 mb-6">
            {results.length} results for "{query}"
          </p>

          {loading && <LoadingSpinner />}
          {error && (
            <div className="text-center py-20 text-gray-400">
              <p className="text-xl">😕 {error}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((med) => (
              <MedicineCard key={med.id} medicine={med} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </SidebarProvider>
  )
}

export default SearchResults