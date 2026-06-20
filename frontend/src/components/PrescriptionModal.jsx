import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function PrescriptionModal({ appointment, onClose, onSaved }) {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', frequency: '', duration: '' }
  ])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [existingPrescription, setExistingPrescription] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(true)

  const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 8 hours', 'Every 6 hours', 'As needed']
  const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month']

  useEffect(() => {
    fetchExisting()
  }, [])

  const fetchExisting = async () => {
    setLoadingExisting(true)
    const { data } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('appointment_id', appointment.id)
      .single()
    if (data) {
      setExistingPrescription(data)
      setMedicines(data.medicines.length > 0 ? data.medicines : [{ name: '', dosage: '', frequency: '', duration: '' }])
      setNotes(data.notes || '')
    }
    setLoadingExisting(false)
  }

  const addMedicine = () => {
    setMedicines(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }])
  }

  const removeMedicine = (idx) => {
    setMedicines(prev => prev.filter((_, i) => i !== idx))
  }

  const updateMedicine = (idx, field, value) => {
    setMedicines(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  const handleSave = async () => {
    const validMeds = medicines.filter(m => m.name.trim())
    if (validMeds.length === 0) { setError('Add at least one medicine'); return }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        appointment_id: appointment.id,
        doctor_id: user.id,
        patient_id: appointment.patient_id || null,
        walkin_name: appointment.source === 'walkin' ? appointment.walkin_name : null,
        medicines: validMeds,
        notes: notes.trim() || null,
      }
      if (existingPrescription) {
        const { error: updateError } = await supabase
          .from('prescriptions')
          .update({ medicines: validMeds, notes: notes.trim() || null })
          .eq('id', existingPrescription.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('prescriptions')
          .insert(payload)
        if (insertError) throw insertError
      }
      onSaved(`Prescription saved for ${appointment.patient_name}`)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save prescription')
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900">
              {existingPrescription ? 'Edit Prescription' : 'Write Prescription'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {appointment.patient_name} · {appointment.appointment_date} · {appointment.appointment_time}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {loadingExisting ? (
          <div className="py-8 text-center text-gray-300 text-sm">Loading…</div>
        ) : (
          <>
            <div className="space-y-3">
              {medicines.map((med, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Medicine {idx + 1}</p>
                    {medicines.length > 1 && (
                      <button onClick={() => removeMedicine(idx)}
                        className="text-red-400 hover:text-red-600 text-xs font-semibold">
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={med.name}
                    onChange={e => updateMedicine(idx, 'name', e.target.value)}
                    placeholder="Medicine name *"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white"
                  />
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={e => updateMedicine(idx, 'dosage', e.target.value)}
                    placeholder="Dosage (e.g. 500mg, 1 tablet)"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={med.frequency} onChange={e => updateMedicine(idx, 'frequency', e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white text-gray-700">
                      <option value="">Frequency</option>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={med.duration} onChange={e => updateMedicine(idx, 'duration', e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 bg-white text-gray-700">
                      <option value="">Duration</option>
                      {DURATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addMedicine}
              className="w-full py-2 border-2 border-dashed border-cyan-200 text-cyan-500 text-sm font-semibold rounded-xl hover:bg-cyan-50 transition-colors">
              + Add Another Medicine
            </button>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Additional Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Take after meals, avoid dairy products…" rows={2}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none" />
            </div>

            {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs">❌ {error}</div>}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={submitting}
                className="flex-1 py-2.5 bg-cyan-500 text-white text-sm font-bold rounded-xl hover:bg-cyan-600 disabled:opacity-50 transition-colors">
                {submitting ? 'Saving…' : existingPrescription ? 'Update Prescription' : 'Save Prescription'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PrescriptionModal