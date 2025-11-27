import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { verifySession } from './features/auth/authSlice'

function App() {
  const { status } = useSelector((state) => state.auth)
  const dispatch = useDispatch()

  useEffect(() => {
    const token = localStorage.getItem('SeatSyncToken')
    if (token) dispatch(verifySession())
  }, [dispatch])

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />} />
          <Route path="/login" element={status === 'authenticated' ? <Navigate to="/dashboard" replace /> : <Login />} />
          <Route path="/signup" element={status === 'authenticated' ? <Navigate to="/dashboard" replace /> : <Signup />} />
          <Route path="/dashboard" element={status === 'authenticated' ? <Dashboard /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
