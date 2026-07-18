import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { supabase, initSupabaseStorage } from './lib/supabase'
import { App as CapApp } from '@capacitor/app'
import './i18n'

const PatientDoctorProfile = lazy(() => import('./pages/PatientDoctorProfile'))
const Landing = lazy(() => import('./pages/Landing'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Home = lazy(() => import('./pages/Home'))
const SearchResults = lazy(() => import('./pages/SearchResults'))
const MedicineDetail = lazy(() => import('./pages/MedicineDetail'))
const AIChat = lazy(() => import('./pages/AIChat'))
const Reminders = lazy(() => import('./pages/Reminders'))
const Profile = lazy(() => import('./pages/Profile'))
const Doctors = lazy(() => import('./pages/Doctors'))
const MyAppointments = lazy(() => import('./pages/MyAppointments'))
const LiveQueue = lazy(() => import('./pages/LiveQueue'))
const MyPrescriptions = lazy(() => import('./pages/MyPrescriptions'))
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'))
const DoctorAppointments = lazy(() => import('./pages/DoctorAppointments'))
const DoctorLiveQueue = lazy(() => import('./pages/DoctorLiveQueue'))
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'))
const DoctorPrescriptions = lazy(() => import('./pages/DoctorPrescriptions'))
const DoctorReviews = lazy(() => import('./pages/DoctorReviews'))
const VideoCall = lazy(() => import('./pages/VideoCall'))
const HOME_ROUTES = ['/home', '/doctor-dashboard']

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
)

const ProtectedRoute = ({ children }) => {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('token', session.access_token)
        setAuthed(true)
      }
      setChecking(false)
    })
  }, [])

  if (checking) return <Loading />
  return authed ? children : <Navigate to="/login" />
}

const PatientRoute = ({ children }) => {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [isDoctor, setIsDoctor] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('token', session.access_token)
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setIsDoctor(user.role === 'doctor')
        setAuthed(true)
      }
      setChecking(false)
    })
  }, [])

  if (checking) return <Loading />
  if (!authed) return <Navigate to="/login" />
  if (isDoctor) return <Navigate to="/doctor-dashboard" />
  return children
}

const DoctorRoute = ({ children }) => {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)
  const [isDoctor, setIsDoctor] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        localStorage.setItem('token', session.access_token)
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setIsDoctor(user.role === 'doctor')
        setAuthed(true)
      }
      setChecking(false)
    })
  }, [])

  if (checking) return <Loading />
  if (!authed) return <Navigate to="/login" />
  if (!isDoctor) return <Navigate to="/home" />
  return children
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } else if (session) {
    localStorage.setItem('token', session.access_token)
    if (!localStorage.getItem('user') && session.user) {
      supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          if (data) localStorage.setItem('user', JSON.stringify(data))
        })
    }
  }
})

function BackButtonHandler() {
  const navigate = useNavigate()
  const locationRef = useRef(window.location.pathname)
  const location = useLocation()

  useEffect(() => {
    locationRef.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    let backHandle = null
    let resumeHandle = null

    CapApp.addListener('backButton', () => {
      const isHome = HOME_ROUTES.includes(locationRef.current)
      if (isHome) {
        CapApp.exitApp()
      } else {
        navigate(-1)
      }
    }).then(h => { backHandle = h })

    CapApp.addListener('resume', async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        localStorage.setItem('token', session.access_token)
      }
    }).then(h => { resumeHandle = h })

    return () => {
      if (backHandle) backHandle.remove()
      if (resumeHandle) resumeHandle.remove()
    }
  }, [navigate])

  return null
}

function App() {
  useEffect(() => {
    initSupabaseStorage()
  }, [])

  return (
    <BrowserRouter>
      <BackButtonHandler />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<PatientRoute><Home /></PatientRoute>} />
          <Route path="/search" element={<PatientRoute><SearchResults /></PatientRoute>} />
          <Route path="/medicine/:id" element={<PatientRoute><MedicineDetail /></PatientRoute>} />
          <Route path="/ai-chat" element={<PatientRoute><AIChat /></PatientRoute>} />
          <Route path="/reminders" element={<PatientRoute><Reminders /></PatientRoute>} />
          <Route path="/doctors" element={<PatientRoute><Doctors /></PatientRoute>} />
          <Route path="/my-appointments" element={<PatientRoute><MyAppointments /></PatientRoute>} />
          <Route path="/my-prescriptions" element={<PatientRoute><MyPrescriptions /></PatientRoute>} />
          <Route path="/live-queue" element={<PatientRoute><LiveQueue /></PatientRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />
          <Route path="/doctor-appointments" element={<DoctorRoute><DoctorAppointments /></DoctorRoute>} />
          <Route path="/doctor-live-queue" element={<DoctorRoute><DoctorLiveQueue /></DoctorRoute>} />
          <Route path="/doctor-profile" element={<DoctorRoute><DoctorProfile /></DoctorRoute>} />
          <Route path="/doctor-prescriptions" element={<DoctorRoute><DoctorPrescriptions /></DoctorRoute>} />
          <Route path="/doctor/:id" element={<PatientRoute><PatientDoctorProfile /></PatientRoute>} />       
          <Route path="/doctor-reviews" element={<DoctorRoute><DoctorReviews /></DoctorRoute>} />
          <Route path="/video-call" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App