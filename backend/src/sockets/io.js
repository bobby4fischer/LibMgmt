const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { SeatStore, MessageStore } = require('../services/store')

let ioRef = null
const online = new Map()

async function activeChatUserNames() {
  await SeatStore.updateExpiry()
  const rows = await SeatStore.find({ bookedBy: { $ne: null } })
  return Array.from(new Set(rows.map((r) => r.bookedBy).filter(Boolean)))
}

async function reservedOnlineCount() {
  const onlineNames = new Set(Array.from(online.values()).map((o) => o.name))
  const actives = await activeChatUserNames()
  let count = 0
  actives.forEach((name) => { if (onlineNames.has(name)) count++ })
  return count
}

async function broadcastContacts() {
  const names = await activeChatUserNames()
  if (ioRef) ioRef.emit('chat:contacts', names)
}

function init(server, corsOrigins) {
  ioRef = new Server(server, { cors: { origin: corsOrigins } })

  ioRef.on('connection', async (socket) => {
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

    const contacts = await activeChatUserNames()
    socket.emit('chat:contacts', contacts)
    await SeatStore.updateExpiry()
    const rows = await SeatStore.find({})
    const seats = Array.isArray(rows) ? rows : []
    socket.emit('seats:state', seats.map((s) => ({ id: s.number, number: s.number, bookedBy: s.bookedBy, endTime: s.endTime, friendLabel: s.friendLabel || null })))
    ioRef.emit('chat:online', await reservedOnlineCount())

    socket.on('chat:dm:history', async (payload) => {
      const peer = String(payload?.peer || '').trim()
      if (!peer) return
      const history = await MessageStore.find(userName, peer)
      socket.emit('chat:dm:history', { peer, history })
    })

    socket.on('chat:dm:send', async (payload) => {
      const to = String(payload?.to || '').trim()
      const text = String(payload?.text || '').trim()
      if (!to || !text) return
      const doc = await MessageStore.create({ sender: userName, receiver: to, text, timestamp: Date.now() })
      const msg = { id: String(doc._id || Date.now()), sender: doc.sender, receiver: doc.receiver, text: doc.text, timestamp: doc.timestamp }
      ioRef.to(`user:${to}`).emit('chat:dm:message', msg)
      ioRef.to(`user:${userName}`).emit('chat:dm:message', msg)
    })

    socket.on('disconnect', async () => {
      online.delete(socket.id)
      ioRef.emit('chat:online', await reservedOnlineCount())
    })
  })
}

function getIO() { return ioRef }

module.exports = { init, getIO, broadcastContacts, reservedOnlineCount }