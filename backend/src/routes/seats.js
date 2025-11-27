const express = require('express')
const auth = require('../middleware/auth')
const { SeatStore } = require('../services/store')
const { seatsAdjacent } = require('../utils/layout')
const { getIO, broadcastContacts, reservedOnlineCount } = require('../sockets/io')

const router = express.Router()
const MAX_MINUTES = 150

// Define pair booking BEFORE id-based routes to avoid Express matching '/pair/book' as '/:id/book'
router.post('/pair/book', auth, async (req, res) => {
  const seatA = Number(req.body?.seatA)
  const seatB = Number(req.body?.seatB)
  const friendName = String(req.body?.friendName || '').trim()
  const minutes = Math.min(Number(req.body?.minutes) || MAX_MINUTES, MAX_MINUTES)
  if (!seatA || !seatB || !friendName) return res.status(400).json({ message: 'seatA, seatB, and friendName are required' })
  await SeatStore.updateExpiry()
  const sA = await SeatStore.findOne({ number: seatA })
  const sB = await SeatStore.findOne({ number: seatB })
  if (!sA || !sB) return res.status(404).json({ message: 'Seat not found' })
  if (sA.bookedBy || sB.bookedBy) return res.status(409).json({ message: 'One or both seats already booked' })
  const rows = await SeatStore.find({})
  const total = Array.isArray(rows) ? rows.length : 60
  if (!seatsAdjacent(seatA, seatB, total)) return res.status(409).json({ message: 'Seats are not adjacent' })
  const now = Date.now()
  sA.bookedBy = req.user.name
  sA.friendLabel = null
  sB.bookedBy = req.user.name
  sB.friendLabel = friendName
  sA.endTime = now + minutes * 60 * 1000
  sB.endTime = now + minutes * 60 * 1000
  await SeatStore.save(sA)
  await SeatStore.save(sB)
  await broadcastContacts()
  const io = getIO()
  io.emit('chat:online', await reservedOnlineCount())
  io.emit('seats:update', { id: sA.number, number: sA.number, bookedBy: sA.bookedBy, endTime: sA.endTime, friendLabel: sA.friendLabel || null })
  io.emit('seats:update', { id: sB.number, number: sB.number, bookedBy: sB.bookedBy, endTime: sB.endTime, friendLabel: sB.friendLabel || null })
  res.json({ seats: [
    { id: sA.number, number: sA.number, bookedBy: sA.bookedBy, endTime: sA.endTime, friendLabel: sA.friendLabel || null },
    { id: sB.number, number: sB.number, bookedBy: sB.bookedBy, endTime: sB.endTime, friendLabel: sB.friendLabel || null }
  ] })
})

router.get('/', async (req, res) => {
  await SeatStore.updateExpiry()
  let seats = await SeatStore.find({})
  if (!Array.isArray(seats)) seats = []
  seats.sort((a, b) => a.number - b.number)
  res.json({ seats: seats.map((s) => ({ id: s.number, number: s.number, bookedBy: s.bookedBy, endTime: s.endTime, friendLabel: s.friendLabel || null })) })
})

router.post('/:id/book', auth, async (req, res) => {
  const seatId = Number(req.params.id)
  const minutes = Math.min(Number(req.body?.minutes) || MAX_MINUTES, MAX_MINUTES)
  await SeatStore.updateExpiry()
  const seat = await SeatStore.findOne({ number: seatId })
  if (!seat) return res.status(404).json({ message: 'Seat not found' })
  if (seat.bookedBy) return res.status(409).json({ message: 'Seat already booked' })
  const endTime = Date.now() + minutes * 60 * 1000
  seat.bookedBy = req.user.name
  seat.friendLabel = null
  seat.endTime = endTime
  await SeatStore.save(seat)
  await broadcastContacts()
  const io = getIO()
  io.emit('chat:online', await reservedOnlineCount())
  io.emit('seats:update', { id: seat.number, number: seat.number, bookedBy: seat.bookedBy, endTime: seat.endTime, friendLabel: seat.friendLabel || null })
  res.json({ seat: { id: seat.number, number: seat.number, bookedBy: seat.bookedBy, endTime: seat.endTime, friendLabel: seat.friendLabel || null } })
})

router.post('/:id/release', auth, async (req, res) => {
  const seatId = Number(req.params.id)
  await SeatStore.updateExpiry()
  const seat = await SeatStore.findOne({ number: seatId })
  if (!seat) return res.status(404).json({ message: 'Seat not found' })
  if (!seat.bookedBy) return res.status(409).json({ message: 'Seat is not booked' })
  if (seat.bookedBy !== req.user.name) return res.status(403).json({ message: 'Not your booking' })
  seat.bookedBy = null
  seat.friendLabel = null
  seat.endTime = null
  await SeatStore.save(seat)
  await broadcastContacts()
  const io = getIO()
  io.emit('chat:online', await reservedOnlineCount())
  io.emit('seats:update', { id: seat.number, number: seat.number, bookedBy: seat.bookedBy, endTime: seat.endTime, friendLabel: seat.friendLabel || null })
  res.json({ seat: { id: seat.number, number: seat.number, bookedBy: seat.bookedBy, endTime: seat.endTime, friendLabel: seat.friendLabel || null } })
})


module.exports = router