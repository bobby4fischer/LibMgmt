import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '../features/auth/authSlice'
import { useNavigate, Link } from 'react-router-dom'
import client from '../api/client'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    
    if (!email || !password) {
      setError('Please enter email and password')
      setIsLoading(false)
      return
    }
    
    try {
      const { data } = await client.post('/auth/login', { email, password })
      localStorage.setItem('SeatSyncToken', data.token)
      dispatch(loginSuccess(data.user))
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed')
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Welcome Back</h2>
      <form onSubmit={onSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"></path>
              <path d="M22 6l-10 7L2 6"></path>
            </svg>
            Email
          </label>
          <input 
            id="email"
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="your@email.com"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>
            Password
          </label>
          <input 
            id="password"
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="••••••••"
            required
          />
        </div>
        
        {error && <div className="error">{error}</div>}
        
        <button 
          type="submit" 
          className="primary-btn" 
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="loading-spinner">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path d="M9 12a3 3 0 106 0 3 3 0 00-6 0z" opacity="0.25"></path>
              </svg>
              <span className="loading-label">Logging in...</span>
            </span>
          ) : 'Sign In'}
        </button>
      </form>
      
      <p>
        Don't have an account? <Link to="/signup">Create one now</Link>
      </p>
    </div>
  )
}