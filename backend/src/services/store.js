const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const useMemory = !process.env.MONGODB_URI

let UserStore, SeatStore, MessageStore

if (!useMemory) {
  const UserSchema = new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true }, password: { type: String, required: true } })
  const SeatSchema = new mongoose.Schema({ number: { type: Number, required: true, unique: true }, bookedBy: { type: String, default: null }, endTime: { type: Number, default: null }, friendLabel: { type: String, default: null } })
  const MessageSchema = new mongoose.Schema({ sender: { type: String, required: true }, receiver: { type: String, required: true }, text: { type: String, required: true, maxlength: 500 }, timestamp: { type: Number, required: true } })

  const User = mongoose.model('User', UserSchema)
  const Seat = mongoose.model('Seat', SeatSchema)
  const Message = mongoose.model('Message', MessageSchema)

  UserStore = {
    findOne: async (q) => User.findOne(q),
    findById: async (id) => User.findById(id),
    create: async (doc) => User.create(doc),
  }

  SeatStore = {
    find: async (q = {}) => Seat.find(q),
    findOne: async (q) => Seat.findOne(q),
    updateExpiry: async () => {
      const now = Date.now()
      await Seat.updateMany({ endTime: { $ne: null, $lte: now } }, { $set: { bookedBy: null, endTime: null } })
    },
    count: async () => Seat.countDocuments(),
    insertMany: async (docs) => Seat.insertMany(docs),
    save: async (doc) => doc.save(),
  }

  MessageStore = {
    find: async (sender, receiver) => Message.find({ $or: [ { sender, receiver }, { sender: receiver, receiver: sender } ] }).sort({ timestamp: 1 }).limit(200),
    create: async (doc) => Message.create(doc),
  }
} else {
  const users = []
  const seats = Array.from({ length: 60 }, (_, i) => ({ number: i + 1, bookedBy: null, endTime: null, friendLabel: null }))
  const messages = []

  UserStore = {
    findOne: async (q) => users.find((u) => u.email === q.email) || null,
    findById: async (id) => users.find((u) => String(u._id) === String(id)) || null,
    create: async (doc) => { const _id = String(users.length + 1); const u = { _id, ...doc }; users.push(u); return u },
  }

  SeatStore = {
    find: async (q = {}) => {
      let arr = seats
      if (q.bookedBy && q.bookedBy.$ne === null) arr = arr.filter((s) => s.bookedBy !== null)
      return arr.slice().sort((a, b) => a.number - b.number)
    },
    findOne: async (q) => seats.find((s) => s.number === q.number) || null,
    updateExpiry: async () => {
      const now = Date.now()
      seats.forEach((s) => { if (s.endTime && s.endTime <= now) { s.bookedBy = null; s.endTime = null } })
    },
    count: async () => seats.length,
    insertMany: async (docs) => { docs.forEach((d) => seats.push(d)) },
    save: async () => {},
  }

  MessageStore = {
    find: async (sender, receiver) => messages.filter((m) => (m.sender === sender && m.receiver === receiver) || (m.sender === receiver && m.receiver === sender)).sort((a, b) => a.timestamp - b.timestamp).slice(-200),
    create: async (doc) => { const _id = String(Date.now()); const m = { _id, ...doc }; messages.push(m); return m },
  }
}

module.exports = { UserStore, SeatStore, MessageStore }