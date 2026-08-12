import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function CompleteProfile() {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phone)
        .neq('id', user.id)
        .maybeSingle()

      if (existing) {
        setError('This phone number is already registered')
        setLoading(false)
        return
      }

      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ phone })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      localStorage.setItem('user', JSON.stringify(updated))
      navigate(updated.role === 'doctor' ? '/doctor-dashboard' : '/home')
    } catch (err) {
      setError(err.message || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">One more step</h1>
          <p className="text-gray-500 text-sm mt-1">Add your phone number to finish setting up your account</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter phone number"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 text-white py-3 rounded-xl hover:bg-cyan-600 font-medium"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CompleteProfile