import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../features/auth/authSlice'
import ChatDrawer from './ChatDrawer'
import './ChatDrawer.css'

export default function Layout({ children }) {
  const { status, user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const location = useLocation()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup'
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'

  // Lock body scroll while chat drawer is open to prevent background scrolling
  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden'
      // Reset unread count when opening chat
      setUnreadCount(0)
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isChatOpen])

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">SeatSync</div>
        <nav className="nav">
          {status === 'authenticated' ? (
            <>
              <button className={`nav-btn chat-btn ${unreadCount ? 'has-unread' : ''}`} onClick={() => setIsChatOpen(true)} disabled={offline} title={offline ? 'Chat unavailable in offline mode' : 'Open chat'}>
                Chat {unreadCount > 0 && <span className="badge" aria-label={`Unread messages: ${unreadCount}`}>{unreadCount}</span>}
              </button>
              <button className="nav-btn logout-btn" onClick={() => dispatch(logout())}>
                Logout {user?.name ? `(${user.name})` : ''}
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup">Signup</Link>
            </>
          )}
        </nav>
      </header>
      <main className={`app-main ${isAuthRoute ? 'centered' : ''}`}>{children}</main>
      <ChatDrawer 
        open={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        user={user}
        onUnread={(inc = 1) => setUnreadCount((c) => c + (typeof inc === 'number' ? inc : 1))}
      />
    </div>
  )
}