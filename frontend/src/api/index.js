import axios from 'axios'

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000',
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

export const getReminders = (userId) => API.get(`/reminders/user/${userId}`)
export const createReminder = (data) => API.post('/reminders/', data)
export const deleteReminder = (id) => API.delete(`/reminders/${id}`)

export const askAI = (question, medicineNames = []) =>
  API.post('/ai/ask', { question, medicine_names: medicineNames })
export const compareMedicines = (medicine1, medicine2) =>
  API.post(`/ai/compare?medicine1=${medicine1}&medicine2=${medicine2}`)