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

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={
          <ProtectedRoute><Home /></ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute><SearchResults /></ProtectedRoute>
        } />
        <Route path="/medicine/:id" element={
          <ProtectedRoute><MedicineDetail /></ProtectedRoute>
        } />
        <Route path="/ai-chat" element={
          <ProtectedRoute><AIChat /></ProtectedRoute>
        } />
        <Route path="/reminders" element={
          <ProtectedRoute><Reminders /></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Profile /></ProtectedRoute>
        } />
        <Route path="/doctors" element={
          <ProtectedRoute><Doctors /></ProtectedRoute>
        } />
        <Route path="/my-appointments" element={
          <ProtectedRoute><MyAppointments /></ProtectedRoute>
        } />
        <Route path="/doctor-dashboard" element={
          <ProtectedRoute><DoctorDashboard /></ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App