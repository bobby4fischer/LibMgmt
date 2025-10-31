import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export default function ChatDrawer({ open, onClose, user }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [onlineCount, setOnlineCount] = useState(0)
  const [contacts, setContacts] = useState([])
  const [activeContact, setActiveContact] = useState(null)
  const [contactQuery, setContactQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesRef = useRef(null)
  const socketRef = useRef(null)

  const formatTime = (ts) => {
    if (!ts) return ''
    const d = new Date(ts)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (!open) return
    const token = localStorage.getItem('SeatSyncToken')
    const socket = io('http://localhost:5000', { auth: { token } })
    socketRef.current = socket

    socket.on('connect', () => {})
    socket.on('chat:online', (count) => setOnlineCount(Number(count) || 0))

    socket.on('chat:contacts', (list) => {
      const me = user?.name
      const arr = Array.isArray(list) ? list.filter((n) => n && n !== me) : []
      setContacts(arr)
    })

    socket.on('chat:dm:history', ({ peer, history }) => {
      if (peer === activeContact) setMessages(history || [])
    })

    socket.on('chat:dm:message', (msg) => {
      const me = user?.name
      const involvesMe = msg.sender === me || msg.receiver === me
      if (!involvesMe) return

      const matchesCurrent = activeContact && (
        (msg.sender === activeContact && msg.receiver === me) ||
        (msg.sender === me && msg.receiver === activeContact)
      )

      if (matchesCurrent) {
        setMessages((prev) => [...prev, msg])
      } else if (msg.receiver === me) {
        // Ensure we can converse with non-reserved senders: add to contacts and open conversation
        setContacts((prev) => (prev.includes(msg.sender) ? prev : [msg.sender, ...prev]))
        // Switch to the sender and load history (which will include this message)
        selectContact(msg.sender)
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [open])

  // If a contact disappears (released all seats), gracefully exit the conversation
  useEffect(() => {
    if (activeContact && !contacts.includes(activeContact)) {
      setActiveContact(null)
      setMessages([])
    }
  }, [contacts, activeContact])

  const selectContact = (name) => {
    // Prevent re-selecting the same contact to avoid glitches
    if (name === activeContact) return
    
    setIsLoading(true)
    setActiveContact(name)
    setMessages([])
    
    if (socketRef.current) {
      socketRef.current.emit('chat:dm:history', { peer: name })
      // Set a timeout to ensure loading state is visible even if history loads quickly
      setTimeout(() => setIsLoading(false), 300)
    } else {
      setIsLoading(false)
    }
  }

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    if (socketRef.current && activeContact) {
      // Create a new message object with a temporary ID
      const newMessage = {
        id: Date.now().toString(),
        sender: user?.name,
        receiver: activeContact,
        text: text,
        timestamp: new Date().toISOString()
      }
      
      // Add message to local state immediately
      setMessages(prev => [...prev, newMessage])
      
      // Send to server
      socketRef.current.emit('chat:dm:send', { to: activeContact, text })
    }
    setInput('')
  }

  const onEnter = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {open && <div className="chat-overlay" onClick={onClose} />}
      <aside className={`chat-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="chat-header">
          <div className="chat-title">Chat Room <span className="online">• {onlineCount} online</span></div>
          <button className="chat-close" aria-label="Close chat" title="Close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="chat-main">
          <div className="contact-pane">
            <div className="contacts-toolbar">
              <div className="search-container">
                <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" 
                  fill="currentColor"/>
                </svg>
                <input
                  className="contact-search"
                  type="text"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Search contacts..."
                  aria-label="Search contacts"
                />
                {contactQuery && (
                  <button 
                    className="clear-search" 
                    onClick={() => setContactQuery('')}
                    aria-label="Clear search"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" 
                      fill="currentColor"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div className="contacts-list" role="list">
              {contacts.length === 0 ? (
                <div className="no-contacts">No contacts available</div>
              ) : (
                (contactQuery ? contacts.filter((n) => n.toLowerCase().includes(contactQuery.toLowerCase())) : contacts).map((name) => (
                <button
                  key={name}
                  className={`contact-item ${activeContact === name ? 'active' : ''}`}
                  onClick={() => selectContact(name)}
                  role="listitem"
                  aria-current={activeContact === name}
                  title={`Chat with ${name}`}
                >
                  <span className="avatar" aria-hidden>{name.slice(0,1).toUpperCase()}</span>
                  <span className="contact-name">{name}</span>
                </button>
              ))
                )}
            </div>
          </div>
          <div className="conversation-pane">
            {activeContact ? (
              <>
                <div className="conversation-header">
                  <button 
                    className="back-button" 
                    onClick={() => setActiveContact(null)} 
                    aria-label="Back to contacts"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span className="avatar" aria-hidden>{activeContact.slice(0,1).toUpperCase()}</span>
                  <span className="contact-name">{activeContact}</span>
                </div>
                <div className="chat-messages" ref={messagesRef}>
                  {isLoading ? (
                    <div className="loading-messages">
                      <div className="loading-spinner"></div>
                      <div>Loading messages...</div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="empty-conversation">
                      <div className="empty-icon">💬</div>
                      <div>No messages yet</div>
                      <div className="empty-hint">Send a message to start the conversation</div>
                    </div>
                  ) : (
                    messages.map((m) => (
                      <div key={m.id} className={`bubble ${m.sender === user?.name ? 'me' : ''}`}>
                        <div className="bubble-text">{m.text}</div>
                        {m.timestamp && <div className="bubble-time">{formatTime(m.timestamp)}</div>}
                      </div>
                    ))
                  )}
                </div>
                <div className="chat-input">
                  <textarea
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onEnter}
                    placeholder={`Message ${activeContact}`}
                    maxLength={500}
                    disabled={!activeContact}
                  />
                  <button className="send-btn" onClick={sendMessage} disabled={!activeContact || !input.trim()}>Send</button>
                </div>
              </>
            ) : (
              <div className="conversation-placeholder" aria-label="No chat selected">
                Select a contact to start chatting
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}