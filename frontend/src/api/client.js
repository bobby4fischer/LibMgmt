import axios from 'axios'

const base = import.meta?.env?.VITE_API_URL || 'http://localhost:5000/api'
const client = axios.create({ baseURL: base })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('SeatSyncToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client