import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DoctorTopBar from '../components/DoctorTopBar'
import DoctorSidebar from '../components/DoctorSidebar'
import { SidebarProvider } from '../components/SidebarContext'
import { supabase } from '../lib/supabase'

const avatarColors = ['bg-cyan-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500']
const getColor = (name) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

function StarDisplay({ value }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} className={`w-4 h-4 ${star <= value ? 'text-amber-400' : 'text-gray-200'}`} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewBar({ label, count, total, active, onClick }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2 py-1 rounded-lg px-1 transition-colors ${active ? 'bg-cyan-50' : 'hover:bg-gray-50'}`}>
      <span className="text-xs text-gray-500 w-3 shrink-0">{label}</span>
      <svg className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-cyan-500' : 'text-amber-400'}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6 text-right shrink-0">{count}</span>
    </button>
  )
}

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days < 1) return 'Today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

const PAGE_SIZE = 10

function DoctorReviews() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStar, setFilterStar] = useState(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Stats
  const [avgRating, setAvgRating] = useState(0)
  const [breakdown, setBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 })
  const [thisMonthCount, setThisMonthCount] = useState(0)

  useEffect(() => {
    if (user.role !== 'doctor') { navigate('/home'); return }
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    try {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('id, rating, review_text, created_at, patient_id')
        .eq('doctor_id', user.id)
        .order('created_at', { ascending: false })

      if (!reviewData || reviewData.length === 0) {
        setReviews([])
        setLoading(false)
        return
      }

      // Fetch patient names
      const patientIds = [...new Set(reviewData.map(r => r.patient_id))]
      const { data: patients } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', patientIds)
      const nameMap = Object.fromEntries((patients || []).map(p => [p.id, p.full_name]))

      const enriched = reviewData.map(r => ({
        ...r,
        patient_name: nameMap[r.patient_id] || 'Patient',
      }))

      setReviews(enriched)

      // Compute stats
      const total = enriched.length
      const avg = total ? enriched.reduce((s, r) => s + r.rating, 0) / total : 0
      setAvgRating(avg.toFixed(1))

      const bd = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      enriched.forEach(r => { if (bd[r.rating] !== undefined) bd[r.rating]++ })
      setBreakdown(bd)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      setThisMonthCount(enriched.filter(r => r.created_at >= monthStart).length)

    } catch {}
    setLoading(false)
  }

  const totalReviews = reviews.length
  const filteredReviews = filterStar ? reviews.filter(r => r.rating === filterStar) : reviews
  const visibleReviews = filteredReviews.slice(0, visibleCount)

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f0f4f8] flex">
        <DoctorSidebar />
        <div className="lg:ml-56 flex-1 flex flex-col">
          <DoctorTopBar />
          <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-6xl">

            {/* Back */}
            <button onClick={() => navigate('/doctor-dashboard')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
              ← Back to dashboard
            </button>

            {/* Hero card */}
            <div className="relative bg-white rounded-3xl p-6 mb-6 shadow-sm overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Patient Feedback</p>
                <h1 className="text-3xl font-black text-gray-900 mb-1">Reviews & Ratings</h1>
                <p className="text-sm text-gray-400">What your patients are saying about their visits.</p>
              </div>
              {/* Decorative blob */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-50 rounded-full translate-x-16 -translate-y-8 z-0" />
            </div>

            {loading ? (
              <div className="text-center py-20 text-gray-400 text-sm">Loading reviews…</div>
            ) : totalReviews === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">⭐</p>
                <p className="text-gray-500 font-semibold">No reviews yet</p>
                <p className="text-gray-400 text-sm mt-1">Your patient reviews will appear here once they start coming in.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

                {/* Left: Ratings overview */}
                <div className="xl:col-span-1">
                  <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-6">
                    <h2 className="text-base font-black text-gray-800 mb-4">Ratings overview</h2>

                    {/* Avg */}
                    <div className="flex items-end gap-3 mb-4">
                      <span className="text-5xl font-black text-gray-900">{avgRating}</span>
                      <div className="pb-1">
                        <StarDisplay value={Math.round(avgRating)} />
                        <p className="text-xs text-gray-400 mt-1">Based on {totalReviews} reviews</p>
                      </div>
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-1 mb-4">
                      {[5, 4, 3, 2, 1].map(n => (
                        <ReviewBar
                          key={n}
                          label={n}
                          count={breakdown[n] || 0}
                          total={totalReviews}
                          active={filterStar === n}
                          onClick={() => {
                            setFilterStar(prev => prev === n ? null : n)
                            setVisibleCount(PAGE_SIZE)
                          }}
                        />
                      ))}
                    </div>

                    {filterStar && (
                      <button onClick={() => { setFilterStar(null); setVisibleCount(PAGE_SIZE) }}
                        className="flex items-center gap-1 text-xs text-cyan-600 font-semibold hover:text-cyan-700 mb-4">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        Clear filter
                      </button>
                    )}

                    {/* This month */}
                    <div className="border-t border-gray-100 pt-4">
                      <div className="bg-gray-50 rounded-xl px-4 py-3">
                        <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">📈 This month</p>
                        <p className="text-2xl font-black text-gray-800">+{thisMonthCount}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Reviews list */}
                <div className="xl:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-base font-black text-gray-800">
                        Patient reviews{' '}
                        <span className="text-gray-400 font-normal">({filteredReviews.length})</span>
                      </h2>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        Sorted by most recent
                      </span>
                    </div>

                    {filteredReviews.length === 0 ? (
                      <div className="text-center py-10 text-gray-400 text-sm">
                        No {filterStar}★ reviews yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {visibleReviews.map((r, idx) => (
                          <div key={r.id} className={`p-4 rounded-2xl border border-gray-100 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${getColor(r.patient_name)} rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                  {getInitials(r.patient_name)}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-800">{r.patient_name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <StarDisplay value={r.rating} />
                                    <span className="text-xs text-gray-400">· {timeAgo(r.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-100 px-2.5 py-1 rounded-full shrink-0">
                                {r.rating}★
                              </span>
                            </div>
                            {r.review_text && (
                              <p className="text-sm text-gray-600 mt-3 ml-13 leading-relaxed pl-13" style={{ paddingLeft: '52px' }}>
                                {r.review_text}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {visibleCount < filteredReviews.length && (
                      <button onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                        className="w-full mt-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                        Load more reviews
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default DoctorReviews