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
import DoctorDashboard from './pages/DoctorDashboard'

// Requires login; redirects to /login if not authenticated
const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

// Only for patients/caretakers — redirects doctors to their dashboard
const PatientRoute = ({ children }) => {
  const token = sessionStorage.getItem('token')
  if (!token) return <Navigate to="/login" />
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  if (user.role === 'doctor') return <Navigate to="/doctor-dashboard" />
  return children
}

// Only for doctors — redirects patients to their home
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

        {/* Patient / caretaker routes */}
        <Route path="/home" element={
          <PatientRoute><Home /></PatientRoute>
        } />
        <Route path="/search" element={
          <PatientRoute><SearchResults /></PatientRoute>
        } />
        <Route path="/medicine/:id" element={
          <PatientRoute><MedicineDetail /></PatientRoute>
        } />
        <Route path="/ai-chat" element={
          <PatientRoute><AIChat /></PatientRoute>
        } />
        <Route path="/reminders" element={
          <PatientRoute><Reminders /></PatientRoute>
        } />
        <Route path="/doctors" element={
          <PatientRoute><Doctors /></PatientRoute>
        } />
        <Route path="/my-appointments" element={
          <PatientRoute><MyAppointments /></PatientRoute>
        } />

        {/* Shared route (both roles can access) */}
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />

        {/* Doctor-only route */}
        <Route path="/doctor-dashboard" element={
          <DoctorRoute><DoctorDashboard /></DoctorRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
