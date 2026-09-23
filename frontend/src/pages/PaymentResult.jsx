// frontend/src/pages/PaymentResult.jsx
import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PaymentResult() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const status = searchParams.get('status')
  const appointmentId = searchParams.get('appointment_id')

  const [loading, setLoading] = useState(true)
  const [appointment, setAppointment] = useState(null)

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false)
      return
    }

    supabase
      .from('appointments')
      .select('appointment_date, appointment_time, doctor_id')
      .eq('id', appointmentId)
      .single()
      .then(({ data }) => {
        setAppointment(data)
        setLoading(false)
      })
  }, [appointmentId])

  const isSuccess = status === 'success'
  const isFailed = status === 'failed'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        {isSuccess && (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
              <svg className="h-8 w-8 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 mb-2">Payment Successful</h1>
            <p className="text-gray-500 mb-6">
              Your payment has been received. The doctor will review and accept your appointment shortly.
            </p>
            {!loading && appointment && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left text-sm text-gray-600">
                <p><span className="font-semibold text-gray-800">Date:</span> {appointment.appointment_date}</p>
                <p><span className="font-semibold text-gray-800">Time:</span> {appointment.appointment_time}</p>
              </div>
            )}
          </>
        )}

        {isFailed && (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-500 mb-6">
              Your payment could not be completed. If any amount was deducted, it will be refunded within 5–7 business days.
            </p>
          </>
        )}

        {!isSuccess && !isFailed && (
          <>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 mb-2">Something Went Wrong</h1>
            <p className="text-gray-500 mb-6">
              We couldn't confirm your payment status. If you were charged, please contact support and we'll sort it out.
            </p>
          </>
        )}

        <button
          onClick={() => navigate('/my-appointments')}
          className="w-full bg-emerald-700 hover:bg-emerald-500 font-bold tracking-tight text-white px-8 py-3 rounded-lg transition-colors"
        >
          Go to My Appointments
        </button>

        {isFailed && appointmentId && (
          <button
            onClick={() => navigate(`/doctor/${appointment?.doctor_id || ''}`)}
            className="w-full mt-3 border border-gray-300 hover:bg-gray-50 font-bold tracking-tight text-gray-700 px-8 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}