import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import TopBar from '../components/TopBar'
import LoadingSpinner from '../components/LoadingSpinner'
import { getMedicine, getMedicineLeaflet } from '../api'

function MedicineDetail() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { id } = useParams()
  const navigate = useNavigate()
  const [medicine, setMedicine] = useState(null)
  const [leaflet, setLeaflet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const fetch = async () => {
      try {
        const [medRes, leafRes] = await Promise.all([
          getMedicine(id),
          getMedicineLeaflet(id)
        ])
        setMedicine(medRes.data)
        setLeaflet(leafRes.data)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    </div>
  )

  const tabs = ['overview', 'dosage', 'side effects', 'warnings']

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="ml-56 flex-1 flex flex-col">
        <TopBar onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <div className="px-10 py-8">

          <button
            onClick={() => navigate(-1)}
            className="text-cyan-500 hover:underline mb-6 flex items-center gap-1"
          >
            ← Back
          </button>

          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 max-w-4xl">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {medicine?.medicine_name}
                </h1>
                <p className="text-gray-500 mt-1">
                  {medicine?.brand_name} • {medicine?.generic_name}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {medicine?.drug_class}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  medicine?.is_otc
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {medicine?.is_otc ? 'OTC' : 'Prescription Required'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto max-w-4xl">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
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
          <div className="bg-white rounded-2xl shadow-sm p-6 max-w-4xl">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Manufacturer</h3>
                  <p className="text-gray-600">{medicine?.manufacturer}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Indications</h3>
                  <p className="text-gray-600">{leaflet?.indications}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Storage</h3>
                  <p className="text-gray-600">{medicine?.storage_instructions}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Mechanism of Action</h3>
                  <p className="text-gray-600">{leaflet?.mechanism_of_action}</p>
                </div>
              </div>
            )}

            {activeTab === 'dosage' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-700 mb-1">Adult Dose</h3>
                  <p className="text-blue-600">{leaflet?.dosage_adult}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-700 mb-1">Child Dose</h3>
                  <p className="text-blue-600">{leaflet?.dosage_child}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h3 className="font-semibold text-blue-700 mb-1">Elderly Dose</h3>
                  <p className="text-blue-600">{leaflet?.dosage_elderly}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Food Interactions</h3>
                  <p className="text-gray-600">{leaflet?.food_interactions}</p>
                </div>
              </div>
            )}

            {activeTab === 'side effects' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Common Side Effects</h3>
                  <div className="flex flex-wrap gap-2">
                    {leaflet?.side_effects_common?.map((effect, i) => (
                      <span key={i} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Serious Side Effects</h3>
                  <div className="flex flex-wrap gap-2">
                    {leaflet?.side_effects_serious?.map((effect, i) => (
                      <span key={i} className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">
                        {effect}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Drug Interactions</h3>
                  <p className="text-gray-600">{leaflet?.drug_interactions}</p>
                </div>
              </div>
            )}

            {activeTab === 'warnings' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                  <h3 className="font-semibold text-red-700 mb-1">⚠️ Warnings</h3>
                  <p className="text-red-600">{leaflet?.warnings}</p>
                </div>
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                  <h3 className="font-semibold text-red-700 mb-1">Contraindications</h3>
                  <p className="text-red-600">{leaflet?.contraindications}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-1">Overdose Info</h3>
                  <p className="text-gray-600">{leaflet?.overdose_info}</p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Pregnancy Category</p>
                    <p className="font-bold text-gray-700">{leaflet?.pregnancy_category}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">Breastfeeding Safe</p>
                    <p className="font-bold text-gray-700">
                      {leaflet?.breastfeeding_safe ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 px-6 py-4 text-center text-sm text-amber-700 mt-8 rounded-2xl max-w-4xl">
            ⚠️ For educational purposes only. Always consult a licensed healthcare professional.
          </div>
        </div>
      </div>
    </div>
  )
}

export default MedicineDetail