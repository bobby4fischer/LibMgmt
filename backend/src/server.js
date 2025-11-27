const dotenv = require('dotenv')
dotenv.config()
const http = require('http')
const mongoose = require('mongoose')
const app = require('./app')
const { init } = require('./sockets/io')
const { SeatStore } = require('./services/store')

async function start() {
  if (process.env.MONGODB_URI) {
    try { await mongoose.connect(process.env.MONGODB_URI) } catch {}
  }
  const count = await SeatStore.count()
  if (count === 0) {
    const docs = Array.from({ length: 60 }, (_, i) => ({ number: i + 1, bookedBy: null, endTime: null }))
    await SeatStore.insertMany(docs)
  }
  const server = http.createServer(app)
  init(server, ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'])
  const PORT = process.env.PORT || 5000
  server.listen(PORT, () => { console.log(`SeatSync API listening on http://localhost:${PORT}`) })
}

start()