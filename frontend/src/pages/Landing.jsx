import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

const specialties = [
  { icon: '🫀', name: 'Cardiologist' },
  { icon: '🧠', name: 'Neurologist' },
  { icon: '🦴', name: 'Orthopedic' },
  { icon: '👶', name: 'Pediatrician' },
  { icon: '🩺', name: 'General Physician' },
  { icon: '🧴', name: 'Dermatologist' },
  { icon: '🧘', name: 'Psychiatrist' },
  { icon: '👂', name: 'ENT' },
]

const stats = [
  { value: '500+', label: 'Verified Doctors' },
  { value: '10k+', label: 'Happy Patients' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '24/7', label: 'Support' },
]

const steps = [
  { step: '01', title: 'Search a Doctor', desc: 'Find specialists by name, specialty, or clinic near you.' },
  { step: '02', title: 'Book Instantly', desc: 'Pick a time slot that works for you and confirm in seconds.' },
  { step: '03', title: 'Get Treated', desc: 'Visit the doctor or connect online — your health, your choice.' },
]

const testimonials = [
  { name: 'Priya Sharma', role: 'Patient', text: 'Booked a cardiologist in under 2 minutes. Absolutely seamless!', avatar: 'P' },
  { name: 'Rohan Mehta', role: 'Patient', text: 'The AI chat helped me understand my prescription before the visit.', avatar: 'R' },
  { name: 'Anjali Nair', role: 'Caretaker', text: 'Managing my mother\'s appointments has never been this easy.', avatar: 'A' },
]

function Landing() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${query}`)
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-base">M</span>
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">MediInfo</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-500">
          <a href="#specialties" className="hover:text-cyan-500 transition-colors">Specialties</a>
          <a href="#how" className="hover:text-cyan-500 transition-colors">How it works</a>
          <a href="#testimonials" className="hover:text-cyan-500 transition-colors">Reviews</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-cyan-500 transition-colors">
            Login
          </Link>
          <Link to="/register" className="bg-cyan-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-cyan-600 transition-colors shadow-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-50 via-white to-blue-50 px-6 pt-20 pb-24">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-100 rounded-full opacity-40 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100 rounded-full opacity-30 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            🏥 India's Trusted Doctor Booking Platform
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-gray-900 leading-tight mb-5 tracking-tight">
            Find & Book the <br />
            <span className="text-cyan-500 relative">
              Right Doctor
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path d="M2 10 Q150 2 298 10" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" fill="none" />
              </svg>
            </span>
            <br /> in Minutes
          </h1>

          <p className="text-gray-500 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect with verified specialists, book appointments instantly, and manage your health — all in one place, built for India.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="flex gap-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
              <div className="flex items-center gap-2 flex-1 px-3">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search doctor, specialty, or medicine..."
                  className="flex-1 py-3 text-gray-700 focus:outline-none text-sm bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="bg-cyan-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-cyan-600 transition-colors shrink-0"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick specialty pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Cardiologist', 'Dermatologist', 'General Physician', 'Pediatrician'].map(s => (
              <button
                key={s}
                onClick={() => navigate(`/doctors?specialty=${s}`)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-500 transition-colors shadow-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-cyan-500 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <div className="text-3xl font-black mb-1">{value}</div>
              <div className="text-cyan-100 text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Specialties ── */}
      <section id="specialties" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">Browse by Specialty</h2>
            <p className="text-gray-500">Find the right expert for your health needs</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {specialties.map(({ icon, name }) => (
              <button
                key={name}
                onClick={() => navigate(`/doctors?specialty=${name}`)}
                className="bg-white rounded-2xl p-6 text-center hover:shadow-md hover:border-cyan-200 border border-gray-100 transition-all group"
              >
                <div className="text-3xl mb-3">{icon}</div>
                <div className="text-sm font-semibold text-gray-700 group-hover:text-cyan-500 transition-colors">{name}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500">Get care in 3 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="w-14 h-14 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-cyan-500 font-black text-lg">{step}</span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-gray-900 mb-3">What Patients Say</h2>
            <p className="text-gray-500">Trusted by thousands across India</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, text, avatar }) => (
              <div key={name} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                    {avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{name}</div>
                    <div className="text-gray-400 text-xs">{role}</div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">"{text}"</p>
                <div className="mt-3 text-yellow-400 text-sm">★★★★★</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-gradient-to-r from-cyan-500 to-cyan-600 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to take charge of your health?</h2>
        <p className="text-cyan-100 mb-8 text-lg">Join thousands of patients booking smarter with MediInfo.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="bg-white text-cyan-600 font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            Create Free Account
          </Link>
          <Link
            to="/register"
            onClick={() => {}}
            className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-cyan-400 transition-colors"
          >
            Register as Doctor →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-10 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">M</span>
          </div>
          <span className="text-white font-bold">MediInfo</span>
        </div>
        <p className="mb-2">AI-powered healthcare, made for India.</p>
        <p className="text-gray-600 text-xs">⚠️ For informational purposes only. Always consult a licensed healthcare professional.</p>
        <p className="text-gray-700 text-xs mt-4">© 2026 MediInfo. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Landing
