import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

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
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard'))
const DoctorAppointments = lazy(() => import('./pages/DoctorAppointments'))
const DoctorLiveQueue = lazy(() => import('./pages/DoctorLiveQueue'))
const DoctorProfile = lazy(() => import('./pages/DoctorProfile'))

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

const PatientRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.role === 'doctor') return <Navigate to="/doctor-dashboard" />
  return children
}

const DoctorRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  if (user.role !== 'doctor') return <Navigate to="/home" />
  return children
}

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } else if (session) {
    localStorage.setItem('token', session.access_token)
  }
})

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
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
          <Route path="/live-queue" element={<PatientRoute><LiveQueue /></PatientRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />
          <Route path="/doctor-appointments" element={<DoctorRoute><DoctorAppointments /></DoctorRoute>} />
          <Route path="/doctor-live-queue" element={<DoctorRoute><DoctorLiveQueue /></DoctorRoute>} />
          <Route path="/doctor-profile" element={<DoctorRoute><DoctorProfile /></DoctorRoute>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App