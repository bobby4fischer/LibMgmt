const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const http = require('http')
const { Server } = require('socket.io')

dotenv.config()

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: false }))
app.use(express.json())

const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:5174'] },
})

// In-memory data stores (replace with MongoDB models later)
const users = []
const MAX_MINUTES = 150
const seats = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  number: i + 1,
  bookedBy: null, // user name
  endTime: null, // epoch ms
}))

// In-memory chat
const chatMessages = []
const online = new Map()
const activeChatUsers = new Set() // users with at least one active seat
const dmHistories = new Map() // key: "userA__userB" (sorted)

function convKey(a, b) {
  const [x, y] = [String(a), String(b)].sort()
  return `${x}__${y}`
}

function recomputeActiveChatUsers() {
  refreshSeatExpiry()
  activeChatUsers.clear()
  seats.forEach((s) => {
    if (s.bookedBy) activeChatUsers.add(s.bookedBy)
  })
}

// Count how many online users currently have at least one reserved seat
function reservedOnlineCount() {
  const onlineNames = new Set(Array.from(online.values()).map((o) => o.name))
  let count = 0
  activeChatUsers.forEach((name) => {
    if (onlineNames.has(name)) count++
  })
  return count
}

function broadcastContacts() {
  io.emit('chat:contacts', Array.from(activeChatUsers))
}

function refreshSeatExpiry() {
  const now = Date.now()
  seats.forEach((s) => {
    if (s.endTime && s.endTime <= now) {
      s.bookedBy = null
      s.endTime = null
    }
  })
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
    req.user = decoded
    next()
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (exists) return res.status(409).json({ message: 'Email already registered' })
  const hash = await bcrypt.hash(password, 10)
  const user = { id: String(users.length + 1), name, email: email.toLowerCase(), password: hash }
  users.push(user)
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase())
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ user: { id: user.id, name: user.name, email: user.email } })
})

app.get('/api/seats', (req, res) => {
  refreshSeatExpiry()
  res.json({ seats })
})

app.post('/api/seats/:id/book', authMiddleware, (req, res) => {
  const seatId = Number(req.params.id)
  const minutes = Math.min(Number(req.body.minutes) || MAX_MINUTES, MAX_MINUTES)
  refreshSeatExpiry()
  const seat = seats.find((s) => s.id === seatId)
  if (!seat) return res.status(404).json({ message: 'Seat not found' })
  if (seat.bookedBy) return res.status(409).json({ message: 'Seat already booked' })
  seat.bookedBy = req.user.name
  seat.endTime = Date.now() + minutes * 60 * 1000
  // Add to chat contacts
  activeChatUsers.add(req.user.name)
  broadcastContacts()
  // Update reserved-online count
  io.emit('chat:online', reservedOnlineCount())
  // Broadcast seat change in real-time
  io.emit('seats:update', seat)
  res.json({ seat })
})

app.post('/api/seats/:id/release', authMiddleware, (req, res) => {
  const seatId = Number(req.params.id)
  refreshSeatExpiry()
  const seat = seats.find((s) => s.id === seatId)
  if (!seat) return res.status(404).json({ message: 'Seat not found' })
  if (!seat.bookedBy) return res.status(409).json({ message: 'Seat is not booked' })
  if (seat.bookedBy !== req.user.name) return res.status(403).json({ message: 'Not your booking' })
  seat.bookedBy = null
  seat.endTime = null
  // Remove from chat contacts only if user has no other seats
  const stillHasSeat = seats.some((s) => s.bookedBy === req.user.name)
  if (!stillHasSeat) {
    activeChatUsers.delete(req.user.name)
    broadcastContacts()
  }
  // Update reserved-online count
  io.emit('chat:online', reservedOnlineCount())
  // Broadcast seat change in real-time
  io.emit('seats:update', seat)
  res.json({ seat })
})

io.on('connection', (socket) => {
  const { token } = socket.handshake.auth || {}
  let userName = 'Guest'
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret')
      userName = decoded.name || 'Guest'
    } catch {}
  }

  online.set(socket.id, { name: userName })
  socket.join(`user:${userName}`)
  recomputeActiveChatUsers()
  socket.emit('chat:contacts', Array.from(activeChatUsers))
  socket.emit('chat:history', chatMessages)
  // Send current seat state to newly connected clients
  socket.emit('seats:state', seats)
  io.emit('chat:online', reservedOnlineCount())

  socket.on('chat:send', (payload) => {
    const text = String(payload?.text || '').trim()
    if (!text) return
    const msg = { id: Date.now(), sender: userName, text, timestamp: Date.now() }
    chatMessages.push(msg)
    if (chatMessages.length > 200) chatMessages.shift()
    io.emit('chat:message', msg)
  })

  socket.on('chat:history:request', () => {
    socket.emit('chat:history', chatMessages)
  })

  socket.on('chat:dm:history', (payload) => {
    const peer = String(payload?.peer || '').trim()
    if (!peer) return
    const key = convKey(userName, peer)
    const history = dmHistories.get(key) || []
    socket.emit('chat:dm:history', { peer, history })
  })

  socket.on('chat:dm:send', (payload) => {
    const to = String(payload?.to || '').trim()
    const text = String(payload?.text || '').trim()
    if (!to || !text) return
    const msg = { id: Date.now(), sender: userName, receiver: to, text, timestamp: Date.now() }
    const key = convKey(userName, to)
    const arr = dmHistories.get(key) || []
    arr.push(msg)
    if (arr.length > 200) arr.shift()
    dmHistories.set(key, arr)
    io.to(`user:${to}`).emit('chat:dm:message', msg)
    io.to(`user:${userName}`).emit('chat:dm:message', msg)
  })

  socket.on('disconnect', () => {
    online.delete(socket.id)
    io.emit('chat:online', reservedOnlineCount())
  })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
  console.log(`SeatSync API listening on http://localhost:${PORT}`)
})