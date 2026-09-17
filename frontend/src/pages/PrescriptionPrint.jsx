import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function PrescriptionPrint() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [prescription, setPrescription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPrescription()
  }, [id])

  const fetchPrescription = async () => {
  setLoading(true)
  setError('')
  try {
    const { data: presc, error: prescError } = await supabase
      .from('prescriptions')
      .select('*, appointments(appointment_date, appointment_time, issue, source, walkin_name, walkin_age, walkin_phone)')
      .eq('id', id)
      .single()

    if (prescError) throw prescError
    if (!presc) throw new Error('Prescription not found')

    // Access control: only the doctor who wrote it or the patient it
    // was written for can view it. Everyone else is bounced.
    const isDoctorOwner = presc.doctor_id === user.id
    const isPatientOwner = presc.patient_id === user.id
    if (!isDoctorOwner && !isPatientOwner) {
      throw new Error('You are not authorized to view this prescription')
    }

    // Fetch doctor and patient separately — avoids depending on
    // Supabase FK constraint names, which vary/aren't always set up
    // for PostgREST's embedded-join syntax.
    const idsToFetch = [presc.doctor_id, presc.patient_id].filter(Boolean)
    let usersById = {}
    if (idsToFetch.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, specialization, clinic_name, license_number, qualifications, experience_years, phone, email')
        .in('id', idsToFetch)
      usersById = Object.fromEntries((users || []).map(u => [u.id, u]))
    }

    setPrescription({
      ...presc,
      doctor: usersById[presc.doctor_id] || {},
      patient: presc.patient_id ? (usersById[presc.patient_id] || null) : null,
    })
  } catch (err) {
    setError(err.message || 'Failed to load prescription')
  }
  setLoading(false)
}

  const handlePrint = () => window.print()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading prescription…
      </div>
    )
  }

  if (error || !prescription) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-red-500 font-semibold">{error || 'Prescription not found'}</p>
        <button onClick={() => navigate(-1)} className="text-cyan-600 text-sm font-semibold hover:underline">
          ← Go back
        </button>
      </div>
    )
  }

  const doctor = prescription.doctor || {}
  const patient = prescription.patient
  const appt = prescription.appointments || {}
  const isWalkin = appt.source === 'walkin'

  const patientName = isWalkin ? (prescription.walkin_name || appt.walkin_name) : patient?.full_name
  const patientAge = isWalkin ? appt.walkin_age : null
  const patientPhone = isWalkin ? appt.walkin_phone : patient?.phone

  const qualifications = Array.isArray(doctor.qualifications) ? doctor.qualifications : []
  const qualString = qualifications.map(q => q.degree).filter(Boolean).join(', ')

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const rxDate = appt.appointment_date || prescription.created_at

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      {/* Top bar — hidden when printing */}
      <div className="no-print max-w-3xl mx-auto mb-4 px-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1">
          ← Back
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors">
            🖨️ Print / Download
          </button>
        </div>
      </div>

      {/* Printable Rx sheet */}
      <div className="prescription-sheet max-w-3xl mx-auto bg-white shadow-lg print:shadow-none rounded-2xl print:rounded-none p-8 sm:p-10">

        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-cyan-600 pb-5 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dr. {doctor.full_name || 'Unknown Doctor'}</h1>
            <p className="text-sm text-cyan-700 font-semibold mt-0.5">
              {qualString || 'MBBS'}{doctor.specialization ? ` · ${doctor.specialization}` : ''}
            </p>
            {doctor.experience_years ? (
              <p className="text-xs text-gray-500 mt-0.5">{doctor.experience_years} years of experience</p>
            ) : null}
            {doctor.license_number && (
              <p className="text-xs text-gray-500 mt-0.5">Reg. No: {doctor.license_number}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            {doctor.clinic_name && <p className="text-sm font-bold text-gray-800">{doctor.clinic_name}</p>}
            {doctor.phone && <p className="text-xs text-gray-500 mt-0.5">📞 {doctor.phone}</p>}
            {doctor.email && <p className="text-xs text-gray-500 mt-0.5">✉️ {doctor.email}</p>}
          </div>
        </div>

        {/* Patient info row */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-6 print:bg-white print:border print:border-gray-300">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Patient</p>
            <p className="text-sm font-bold text-gray-900">
              {patientName || 'Unknown Patient'}
              {patientAge ? <span className="font-medium text-gray-500"> · {patientAge} yrs</span> : ''}
            </p>
            {patientPhone && <p className="text-xs text-gray-500">📞 {patientPhone}</p>}
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Date</p>
            <p className="text-sm font-bold text-gray-900">{fmtDate(rxDate)}</p>
          </div>
        </div>

        {appt.issue && (
          <div className="mb-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Diagnosis / Issue</p>
            <p className="text-sm text-gray-700">{appt.issue}</p>
          </div>
        )}

        {/* Rx symbol + medicines */}
        <div className="mb-6">
          <p className="text-4xl font-serif italic text-cyan-700 leading-none mb-3">℞</p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide py-2 pr-2">Medicine</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide py-2 pr-2">Dosage</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide py-2 pr-2">Frequency</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide py-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {prescription.medicines?.map((med, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 pr-2 text-sm font-bold text-gray-900">{idx + 1}. {med.name}</td>
                  <td className="py-3 pr-2 text-sm text-gray-700">{med.dosage || '—'}</td>
                  <td className="py-3 pr-2 text-sm text-gray-700">{med.frequency || '—'}</td>
                  <td className="py-3 text-sm text-gray-700">{med.duration || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {prescription.notes && (
          <div className="mb-8 bg-cyan-50 print:bg-white print:border print:border-cyan-200 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-cyan-700 uppercase tracking-wide mb-1">Additional Notes</p>
            <p className="text-sm text-gray-700">{prescription.notes}</p>
          </div>
        )}

        {/* Signature */}
        <div className="flex justify-end mt-10">
          <div className="text-center">
            <div className="border-b border-gray-400 w-40 mb-1" />
            <p className="text-xs text-gray-500">Doctor's Signature</p>
          </div>
        </div>

        <p className="text-[10px] text-gray-300 text-center mt-10 pt-4 border-t border-gray-100">
          This is a digitally generated prescription from Niraamo · Generated on {new Date(prescription.created_at).toLocaleString('en-IN')}
        </p>
      </div>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .prescription-sheet {
            max-width: 100% !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 1.5cm !important;
          }
          @page { margin: 0; }
        }
      `}</style>
    </div>
  )
}

export default PrescriptionPrint