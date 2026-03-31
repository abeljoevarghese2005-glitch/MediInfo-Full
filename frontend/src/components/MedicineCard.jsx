import { useNavigate } from 'react-router-dom'

function MedicineCard({ medicine }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">
            {medicine.medicine_name}
          </h3>
          <p className="text-gray-500 text-sm">{medicine.brand_name}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          medicine.is_otc
            ? 'bg-green-100 text-green-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          {medicine.is_otc ? 'OTC' : 'Prescription'}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-1">
        <span className="font-medium">Generic:</span> {medicine.generic_name}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        <span className="font-medium">Class:</span> {medicine.drug_class}
      </p>

      <button
        onClick={() => navigate(`/medicine/${medicine.id}`)}
        className="w-full bg-cyan-500 text-white py-2 rounded-lg hover:bg-cyan-600 transition-colors text-sm font-medium"
      >
        View Details
      </button>
    </div>
  )
}

export default MedicineCard