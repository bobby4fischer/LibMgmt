import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import { useSelector } from 'react-redux'

function App() {
  const { status } = useSelector((state) => state.auth)

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
