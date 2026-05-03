import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import SearchResults from './pages/SearchResults'
import MedicineDetail from './pages/MedicineDetail'
import AIChat from './pages/AIChat'
import Reminders from './pages/Reminders'
import Profile from './pages/Profile'
import Doctors from './pages/Doctors'
import MyAppointments from './pages/MyAppointments'
import LiveQueue from './pages/LiveQueue'
import DoctorDashboard from './pages/DoctorDashboard'
import DoctorAppointments from './pages/DoctorAppointments'
import DoctorLiveQueue from './pages/DoctorLiveQueue'
import DoctorProfile from './pages/DoctorProfile'

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

const PatientRoute = ({ children }) => {
  const token = sessionStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  if (user.role === 'doctor') return <Navigate to="/doctor-dashboard" />
  return children
}

const DoctorRoute = ({ children }) => {
  const token = sessionStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  if (user.role !== 'doctor') return <Navigate to="/home" />
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Patient routes */}
        <Route path="/home" element={<PatientRoute><Home /></PatientRoute>} />
        <Route path="/search" element={<PatientRoute><SearchResults /></PatientRoute>} />
        <Route path="/medicine/:id" element={<PatientRoute><MedicineDetail /></PatientRoute>} />
        <Route path="/ai-chat" element={<PatientRoute><AIChat /></PatientRoute>} />
        <Route path="/reminders" element={<PatientRoute><Reminders /></PatientRoute>} />
        <Route path="/doctors" element={<PatientRoute><Doctors /></PatientRoute>} />
        <Route path="/my-appointments" element={<PatientRoute><MyAppointments /></PatientRoute>} />
        <Route path="/live-queue" element={<PatientRoute><LiveQueue /></PatientRoute>} />

        {/* Shared */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Doctor routes */}
        <Route path="/doctor-dashboard" element={<DoctorRoute><DoctorDashboard /></DoctorRoute>} />
        <Route path="/doctor-appointments" element={<DoctorRoute><DoctorAppointments /></DoctorRoute>} />
        <Route path="/doctor-live-queue" element={<DoctorRoute><DoctorLiveQueue /></DoctorRoute>} />
        <Route path="/doctor/profile" element={<DoctorRoute><DoctorProfile /></DoctorRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
