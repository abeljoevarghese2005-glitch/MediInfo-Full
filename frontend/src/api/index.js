import axios from 'axios'

const API = axios.create({
  baseURL: 'https://mediinfo-full-production.up.railway.app',
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const searchMedicines = (query) => API.get(`/medicines/search?q=${query}`)
export const getAllMedicines = () => API.get('/medicines/')
export const getMedicine = (id) => API.get(`/medicines/${id}`)
export const getMedicineLeaflet = (id) => API.get(`/medicines/${id}/leaflet`)

export const loginUser = (data) => API.post('/auth/login', data)
export const registerUser = (data) => API.post('/auth/register', data)
export const updateUser = (userId, data) => API.put(`/auth/update/${userId}`, data)

export const getReminders = (userId) => API.get(`/reminders/user/${userId}`)
export const createReminder = (data) => {
  const { user_id, ...body } = data
  return API.post(`/reminders/?user_id=${user_id}`, body)
}
export const deleteReminder = (id) => API.delete(`/reminders/${id}`)

export const askAI = (question, medicineNames = [], sessionId = '') =>
  API.post(`/ai/ask`, { question, medicine_names: medicineNames, session_id: sessionId })
export const compareMedicines = (medicine1, medicine2) =>
  API.post(`/ai/compare?medicine1=${medicine1}&medicine2=${medicine2}`)

// Appointments
export const getDoctors = (specialization = '') =>
  API.get(`/appointments/doctors${specialization ? `?specialization=${specialization}` : ''}`)
export const getMyAppointments = (patientId) =>
  API.get(`/appointments/my/${patientId}`)
export const cancelAppointment = (appointmentId) =>
  API.patch(`/appointments/cancel/${appointmentId}`)

// Payment
export const createPaymentOrder = (patientId, data) =>
  API.post(`/appointments/create-order?patient_id=${patientId}`, data)
export const verifyPayment = (patientId, data) =>
  API.post(`/appointments/verify-payment?patient_id=${patientId}`, data)

// Doctor dashboard
export const getDoctorAppointments = (doctorId) =>
  API.get(`/appointments/doctor-dashboard/${doctorId}`)
export const confirmAppointment = (appointmentId) =>
  API.patch(`/appointments/confirm/${appointmentId}`)
export const rejectAppointment = (appointmentId) =>
  API.patch(`/appointments/reject/${appointmentId}`)