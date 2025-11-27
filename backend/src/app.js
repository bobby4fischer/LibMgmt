const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const seatRoutes = require('./routes/seats')

const app = express()
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'] }))
app.use(express.json())

app.get('/api/health', (req, res) => { res.json({ ok: true }) })
app.use('/api/auth', authRoutes)
app.use('/api/seats', seatRoutes)

module.exports = app