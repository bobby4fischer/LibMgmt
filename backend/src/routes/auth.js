const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { UserStore } = require('../services/store')
const auth = require('../middleware/auth')

const router = express.Router()

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
  const lower = String(email).toLowerCase()
  const exists = await UserStore.findOne({ email: lower })
  if (exists) return res.status(409).json({ message: 'Email already registered' })
  const hash = await bcrypt.hash(password, 10)
  const user = await UserStore.create({ name, email: lower, password: hash })
  const token = jwt.sign({ id: String(user._id), name: user.name, email: user.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  res.json({ token, user: { id: String(user._id), name: user.name, email: user.email } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  const lower = String(email || '').toLowerCase()
  const user = await UserStore.findOne({ email: lower })
  if (!user) return res.status(401).json({ message: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
  const token = jwt.sign({ id: String(user._id), name: user.name, email: user.email }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' })
  res.json({ token, user: { id: String(user._id), name: user.name, email: user.email } })
})

router.get('/me', auth, async (req, res) => {
  const user = await UserStore.findById(req.user.id)
  if (!user) return res.status(404).json({ message: 'User not found' })
  res.json({ user: { id: String(user._id), name: user.name, email: user.email } })
})

module.exports = router