import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Heart, Brain, Bone, Baby, Stethoscope, Sparkles, Flower2, Ear } from 'lucide-react'
import { supabase } from '../lib/supabase'

const specialties = [
  { icon: Heart, name: 'Cardiologist', tint: 'bg-rose-100 text-rose-600' },
  { icon: Brain, name: 'Neurologist', tint: 'bg-violet-100 text-violet-600' },
  { icon: Bone, name: 'Orthopedic', tint: 'bg-amber-100 text-amber-600' },
  { icon: Baby, name: 'Pediatrician', tint: 'bg-pink-100 text-pink-600' },
  { icon: Stethoscope, name: 'General Physician', tint: 'bg-sky-100 text-sky-600' },
  { icon: Sparkles, name: 'Dermatologist', tint: 'bg-fuchsia-100 text-fuchsia-600' },
  { icon: Flower2, name: 'Psychiatrist', tint: 'bg-emerald-100 text-emerald-600' },
  { icon: Ear, name: 'ENT', tint: 'bg-orange-100 text-orange-600' },
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
  { name: 'Anjali Nair', role: 'Caretaker', text: "Managing my mother's appointments has never been this easy.", avatar: 'A' },
]

/* ── Decorative floating clock (background ambience only) ── */
function DecorativeClock({ className = '', size = 120 }) {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i * 30 * Math.PI) / 180
    return {
      x1: 50 + 40 * Math.sin(angle),
      y1: 50 - 40 * Math.cos(angle),
      x2: 50 + 44 * Math.sin(angle),
      y2: 50 - 44 * Math.cos(angle),
    }
  })

  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <div className="animate-mi-clock-float">
        <svg width={size} height={size} viewBox="0 0 100 100" className="opacity-[0.08]">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" />
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="currentColor" strokeWidth="1.5" />
          ))}
          <line x1="50" y1="50" x2="50" y2="27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="mi-clock-hour animate-mi-clock-hour" />
          <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mi-clock-minute animate-mi-clock-minute" />
          <circle cx="50" cy="50" r="2.5" fill="currentColor" />
        </svg>
      </div>
    </div>
  )
}

/* ── Specialty card with 3D tilt + sheen, navigation unchanged ── */
function SpecialtyCard({ name, icon: Icon, tint, index, onClick }) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    el.style.setProperty('--mi-ry', `${(px - 0.5) * 14}deg`)
    el.style.setProperty('--mi-rx', `${(0.5 - py) * 14}deg`)
  }

  const handleMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--mi-rx', '0deg')
    el.style.setProperty('--mi-ry', '0deg')
  }

  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-reveal
      style={{ '--i': index }}
      className="mi-tilt-card relative overflow-hidden bg-card rounded-2xl p-6 text-center border border-border hover:shadow-md transition-shadow group"
    >
      <span className="mi-sheen" aria-hidden="true" />
      <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center ${tint}`}>
        <Icon className="w-7 h-7" strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold text-foreground group-hover:text-mi-primary transition-colors">{name}</div>
    </button>
  )
}

function Landing() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  // Apply landing-scoped body class for scroll-behavior + reduced-motion scoping
  useEffect(() => {
    document.body.classList.add('mi-landing')
    return () => document.body.classList.remove('mi-landing')
  }, [])

  // Scroll-reveal observer
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('[data-reveal]'))
    if (elements.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Redirect to home if already logged in — UNCHANGED
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (user.role === 'doctor') {
          navigate('/doctor-dashboard', { replace: true })
        } else {
          navigate('/home', { replace: true })
        }
      }
    })
  }, [])

  // UNCHANGED
  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${query}`)
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-mi-primary to-sky-400 rounded-xl flex items-center justify-center shadow-sm">
            <span className="text-white font-black text-base font-display">M</span>
          </div>
          <span className="text-xl font-black text-foreground tracking-tight">Niraamo</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="#specialties" className="hover:text-mi-primary transition-colors">Specialties</a>
          <a href="#how" className="hover:text-mi-primary transition-colors">How it works</a>
          <a href="#testimonials" className="hover:text-mi-primary transition-colors">Reviews</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-semibold text-muted-foreground hover:text-mi-primary transition-colors">
            Login
          </Link>
          <Link to="/register" className="bg-mi-primary text-mi-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24">
        {/* Aurora blobs */}
        <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
          <div className="animate-mi-aurora absolute -left-24 -top-32 h-[28rem] w-[28rem] rounded-full bg-mi-primary/20 blur-3xl" />
          <div className="animate-mi-aurora absolute -right-32 top-1/3 h-[32rem] w-[32rem] rounded-full bg-sky-300/20 blur-3xl" style={{ animationDelay: '4s' }} />
          <div className="animate-mi-aurora absolute -bottom-32 left-1/4 h-[26rem] w-[26rem] rounded-full bg-emerald-300/15 blur-3xl" style={{ animationDelay: '8s' }} />
        </div>

        {/* Decorative clocks */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden text-mi-primary" aria-hidden="true">
          <DecorativeClock className="absolute left-[6%] top-[14%]" size={100} />
          <DecorativeClock className="absolute right-[8%] top-[8%]" size={140} />
          <DecorativeClock className="absolute bottom-[10%] left-[16%]" size={90} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="animate-mi-fade-up inline-flex items-center gap-2 bg-mi-primary/10 text-mi-primary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-mi-pulse-dot absolute inline-flex h-2 w-2 rounded-full bg-green-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            India's #1 Trusted Doctor Booking Platform
          </div>

          <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground leading-tight mb-5 tracking-tight">
            <span className="mi-reveal-wrap">
              <span className="mi-reveal-up animate-mi-reveal-up">Find &amp; Book the</span>
            </span>
            <span className="mi-reveal-wrap">
              <span className="mi-reveal-up animate-mi-reveal-up mi-delay-1">
                <span className="mi-gradient-text animate-mi-gradient-flow">Right Doctor</span>
              </span>
            </span>
            <span className="mi-reveal-wrap">
              <span className="mi-reveal-up animate-mi-reveal-up mi-delay-2">in Minutes</span>
            </span>
          </h1>

          <p className="animate-mi-fade-up mi-delay-3 text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect with verified specialists, book appointments instantly, and manage your health — all in one place, built for India.
          </p>

          <form onSubmit={handleSearch} className="animate-mi-fade-up mi-delay-4 max-w-2xl mx-auto mb-8">
            <div className="flex gap-2 bg-card rounded-2xl shadow-lg border border-border p-2">
              <div className="flex items-center gap-2 flex-1 px-3">
                <svg className="w-5 h-5 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search doctor, specialty, or medicine..."
                  className="flex-1 py-3 text-foreground focus:outline-none text-sm bg-transparent"
                />
              </div>
              <button type="submit"
                className="bg-mi-primary text-mi-primary-foreground px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shrink-0">
                Search
              </button>
            </div>
          </form>

          <div className="animate-mi-fade-up mi-delay-5 flex flex-wrap justify-center gap-2 mb-8">
            {['Cardiologist', 'Dermatologist', 'General Physician', 'Pediatrician'].map(s => (
              <button key={s} onClick={() => navigate(`/doctors?specialty=${s}`)}
                className="px-4 py-2 bg-card border border-border rounded-full text-sm text-muted-foreground hover:border-mi-primary hover:text-mi-primary transition-colors shadow-sm">
                {s}
              </button>
            ))}
          </div>

          <ul className="animate-mi-fade-up mi-delay-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {['Verified Doctors', 'Instant Booking', '24/7 Support'].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                <svg className="w-4 h-4 text-mi-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Stats ── */}
      <section data-reveal-stagger className="bg-mi-primary py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
          {stats.map(({ value, label }, i) => (
            <div key={label} data-reveal style={{ '--i': i + 1 }}>
              <div className="font-display text-3xl font-bold mb-1">{value}</div>
              <div className="text-cyan-100 text-sm font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Specialties ── */}
      <section id="specialties" className="py-20 px-6 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <div data-reveal className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">Browse by Specialty</h2>
            <p className="text-muted-foreground">Find the right expert for your health needs</p>
          </div>
          <div data-reveal-stagger className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {specialties.map(({ name, icon, tint }, i) => (
              <SpecialtyCard
                key={name}
                name={name}
                icon={icon}
                tint={tint}
                index={i + 1}
                onClick={() => navigate(`/doctors?specialty=${name}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="py-20 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div data-reveal className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground">Get care in 3 simple steps</p>
          </div>
          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ step, title, desc }, i) => (
              <div key={step} data-reveal style={{ '--i': i + 1 }} className="relative text-center">
                <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-mi-primary font-display font-bold text-lg">{step}</span>
                </div>
                <h3 className="font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-20 px-6 bg-muted/40">
        <div className="max-w-4xl mx-auto">
          <div data-reveal className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-3">What Patients Say</h2>
            <p className="text-muted-foreground">Trusted by thousands across India</p>
          </div>
          <div data-reveal-stagger className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, text, avatar }, i) => (
              <div key={name} data-reveal style={{ '--i': i + 1 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex gap-1 text-amber-400 mb-3" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M10 1l2.9 6 6.6.9-4.8 4.6 1.1 6.5L10 15.9 4.2 19l1.1-6.5L.5 7.9l6.6-.9z" />
                    </svg>
                  ))}
                </div>
                <p className="text-foreground/90 text-sm leading-relaxed mb-4">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-mi-primary rounded-full flex items-center justify-center text-white font-bold">
                    {avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{name}</div>
                    <div className="text-muted-foreground text-xs">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section data-reveal className="py-20 px-6 bg-gradient-to-r from-mi-primary to-sky-500 text-center text-white">
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to take charge of your health?</h2>
        <p className="text-cyan-100 mb-8 text-lg">Join thousands of patients booking smarter with Niraamo.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register"
            className="bg-white text-mi-primary font-bold px-8 py-4 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            Create Free Account
          </Link>
          <Link to="/register"
            className="border-2 border-white text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">
            Register as Doctor →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 px-6 py-10 text-center text-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-7 h-7 bg-mi-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs font-display">M</span>
          </div>
          <span className="text-white font-bold">Niraamo</span>
        </div>
        <p className="mb-2">AI-powered healthcare, made for India.</p>
        <p className="text-gray-600 text-xs">⚠️ For informational purposes only. Always consult a licensed healthcare professional.</p>
        <p className="text-gray-700 text-xs mt-4">© 2026 Niraamo. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Landing