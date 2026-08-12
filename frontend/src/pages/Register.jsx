import GoogleAuthButton from '../components/GoogleAuthButton'
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import niraamoLogo from '../assets/niraamo-logo-final.png'

const SPECIALIZATIONS = [
  'General Physician', 'Cardiologist', 'Dermatologist',
  'Neurologist', 'Orthopedic', 'Pediatrician', 'Psychiatrist', 'ENT'
]

function Register() {
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', password: '',
    specialization: '', years_of_experience: '', clinic_name: '',
    medical_license: ''
  })
  const [verificationDoc, setVerificationDoc] = useState(null)
  const [docError, setDocError] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone || !form.password) {
      setError('Please fill in all required fields')
      return
    }
    if (role === 'doctor') {
      if (!form.specialization) {
        setError('Please select your specialization')
        return
      }
      if (!verificationDoc) {
        setDocError(true)
        setError('Please upload your verification document')
        return
      }
    }
    setLoading(true)
    setError('')
    setDocError(false)

    try {
      const email = `${form.phone.replace(/\s+/g, '')}@niraamo.app`

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: form.password,
      })

      if (authError) throw authError

      const userId = authData.user.id

      let docUrl = null
      if (role === 'doctor' && verificationDoc) {
        const fileExt = verificationDoc.name.split('.').pop()
        const filePath = `verification-docs/${userId}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('doctor-docs')
          .upload(filePath, verificationDoc)
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('doctor-docs')
            .getPublicUrl(filePath)
          docUrl = urlData.publicUrl
        }
      }

      // Step 3: Insert identity row into users table
      const { error: profileError } = await supabase.from('users').insert({
        id: userId,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        role,
        auth_provider: 'email',
        is_phone_verified: false,
      })

      if (profileError) throw profileError

      // Step 4: Insert into the correct role-specific profile table
      if (role === 'doctor') {
        const { error: doctorProfileError } = await supabase.from('doctor_profiles').insert({
          user_id: userId,
          specialization: form.specialization,
          years_of_experience: form.years_of_experience || null,
          experience_years: form.years_of_experience || null,
          clinic_name: form.clinic_name || null,
          medical_license: form.medical_license || null,
          license_number: form.medical_license || null,
          verification_doc_url: docUrl,
        })
        if (doctorProfileError) throw doctorProfileError
      } else {
        const { error: patientProfileError } = await supabase.from('patient_profiles').insert({
          user_id: userId,
        })
        if (patientProfileError) throw patientProfileError
      }

      navigate('/login')
    } catch (err) {
      setError(err.message || 'Registration failed')
    }
    setLoading(false)
  }

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm({ ...form, [field]: e.target.value })
  })

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
  const labelCls = "text-sm font-medium text-gray-700 block mb-1"

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-10 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <div className="text-center mb-6">
          <img src={niraamoLogo} alt="Niraamo" className="w-16 h-16 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join Niraamo today</p>
        </div>

        <div className="flex rounded-xl border border-gray-200 p-1 mb-5 gap-1">
          <button
            onClick={() => { setRole('patient'); setError(''); setDocError(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              role === 'patient' ? 'bg-gray-100 text-gray-800' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Patient
          </button>
          <button
            onClick={() => { setRole('doctor'); setError(''); setDocError(false) }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              role === 'doctor' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Doctor
          </button>
        </div>

        {role === 'doctor' && (
          <div className={`px-4 py-3 rounded-lg mb-4 text-sm ${docError ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
            Please upload your verification document.
          </div>
        )}

        {error && !docError && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className={labelCls}>Full Name</label>
            <input type="text" {...f('full_name')} placeholder="Enter your full name" className={inputCls} />
          </div>

          <div className={role === 'doctor' ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input type="text" {...f('phone')} placeholder="Phone number" className={inputCls} />
            </div>
            {role === 'doctor' && (
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" {...f('email')} placeholder="email@example.com" className={inputCls} />
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Password</label>
            <input type="password" {...f('password')} placeholder="Create a password" className={inputCls} />
          </div>

          {role === 'doctor' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Specialization</label>
                  <select {...f('specialization')} className={inputCls}>
                    <option value="">Select...</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Years of Experience</label>
                  <input type="number" min="0" {...f('years_of_experience')} placeholder="e.g. 5" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Clinic / Hospital Name</label>
                <input type="text" {...f('clinic_name')} placeholder="Apollo Clinic" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Medical License Number</label>
                <input type="text" {...f('medical_license')} placeholder="MCI-123456" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Verification Document</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={`w-full px-4 py-3 rounded-xl border-2 border-dashed text-sm cursor-pointer flex items-center gap-2 transition-colors ${
                    verificationDoc
                      ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                      : docError
                      ? 'border-red-300 bg-red-50 text-red-500'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <span className="truncate">
                    {verificationDoc ? verificationDoc.name : 'Click to upload document'}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => { setVerificationDoc(e.target.files[0] || null); setDocError(false) }}
                />
              </div>
            </>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-cyan-500 text-white py-3 rounded-xl hover:bg-cyan-600 font-medium transition-colors"
          >
            {loading ? 'Creating account...' : role === 'doctor' ? 'Register as Doctor' : 'Register'}
          </button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">OR</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <GoogleAuthButton
            role={role}
            label={role === 'doctor' ? 'Sign up as Doctor with Google' : 'Continue with Google'}
          />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-500 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register