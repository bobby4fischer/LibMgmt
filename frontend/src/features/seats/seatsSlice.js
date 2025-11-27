import { createSlice } from '@reduxjs/toolkit'
import client from '../../api/client'
import { createAsyncThunk } from '@reduxjs/toolkit'
import { computeHallLayout } from '../../pages/layout'

const MAX_MINUTES = 150 // 2.5 hours

function generateSeats(count = 60) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    bookedBy: null,
    endTime: null,
  }))
}

export const fetchSeats = createAsyncThunk('seats/fetch', async () => {
  const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'
  if (offline) {
    try {
      const raw = localStorage.getItem('SeatSyncSeats')
      const arr = raw ? JSON.parse(raw) : generateSeats(60)
      localStorage.setItem('SeatSyncSeats', JSON.stringify(arr))
      return arr
    } catch {
      const arr = generateSeats(60)
      localStorage.setItem('SeatSyncSeats', JSON.stringify(arr))
      return arr
    }
  }
  const { data } = await client.get('/seats')
  return data.seats
})

export const bookSeatServer = createAsyncThunk('seats/book', async ({ seatId, minutes }, thunkAPI) => {
  const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'
  if (offline) {
    const state = thunkAPI.getState()
    const user = state?.auth?.user
    if (!user) throw new Error('Not authenticated')
    const raw = localStorage.getItem('SeatSyncSeats')
    const arr = raw ? JSON.parse(raw) : generateSeats(60)
    const seat = arr.find((s) => s.id === seatId)
    if (!seat) throw new Error('Seat not found')
    if (seat.bookedBy) throw new Error('Seat already booked')
    const endTime = Date.now() + Math.min(Number(minutes) || MAX_MINUTES, MAX_MINUTES) * 60 * 1000
    seat.bookedBy = user.name
    seat.endTime = endTime
    localStorage.setItem('SeatSyncSeats', JSON.stringify(arr))
    return seat
  }
  const { data } = await client.post(`/seats/${seatId}/book`, { minutes })
  return data.seat
})

export const releaseSeatServer = createAsyncThunk('seats/release', async ({ seatId }, thunkAPI) => {
  const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'
  if (offline) {
    const state = thunkAPI.getState()
    const user = state?.auth?.user
    const raw = localStorage.getItem('SeatSyncSeats')
    const arr = raw ? JSON.parse(raw) : generateSeats(60)
    const seat = arr.find((s) => s.id === seatId)
    if (!seat) throw new Error('Seat not found')
    if (!seat.bookedBy) throw new Error('Seat is not booked')
    if (seat.bookedBy !== user?.name) throw new Error('Not your booking')
    seat.bookedBy = null
    seat.endTime = null
    localStorage.setItem('SeatSyncSeats', JSON.stringify(arr))
    return seat
  }
  const { data } = await client.post(`/seats/${seatId}/release`)
  return data.seat
})

// Pair booking two adjacent seats atomically on the backend
export const pairBookSeatsServer = createAsyncThunk('seats/pairBook', async ({ seatA, seatB, friendName, minutes }, thunkAPI) => {
  const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'
  if (offline) {
    const state = thunkAPI.getState()
    const user = state?.auth?.user
    const raw = localStorage.getItem('SeatSyncSeats')
    const arr = raw ? JSON.parse(raw) : generateSeats(60)
    const sA = arr.find((s) => s.id === seatA)
    const sB = arr.find((s) => s.id === seatB)
    if (!sA || !sB) throw new Error('Seat not found')
    if (sA.bookedBy || sB.bookedBy) throw new Error('One or both seats already booked')
    const placements = computeHallLayout(arr.length)
    const a = placements[(seatA || 0) - 1]
    const b = placements[(seatB || 0) - 1]
    if (!a || !b) throw new Error('Seats are not adjacent')
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 130) throw new Error('Seats are not adjacent')
    const endTime = Date.now() + Math.min(Number(minutes) || MAX_MINUTES, MAX_MINUTES) * 60 * 1000
    sA.bookedBy = user?.name
    sB.bookedBy = String(friendName || '').trim()
    sA.endTime = endTime
    sB.endTime = endTime
    localStorage.setItem('SeatSyncSeats', JSON.stringify(arr))
    return [sA, sB]
  }
  const { data } = await client.post(`/seats/pair/book`, { seatA, seatB, friendName, minutes })
  return data.seats
})

const initialState = {
  seats: generateSeats(60),
  status: 'idle',
}

const seatsSlice = createSlice({
  name: 'seats',
  initialState,
  reducers: {
    tick: (state) => {
      const now = Date.now()
      state.seats.forEach((seat) => {
        if (seat.endTime && seat.endTime <= now) {
          seat.bookedBy = null
          seat.endTime = null
        }
      })
    },
    applySeatUpdate: (state, action) => {
      const seat = action.payload
      if (!seat || typeof seat.id === 'undefined') return
      const idx = state.seats.findIndex((s) => s.id === seat.id)
      if (idx !== -1) state.seats[idx] = seat
    },
    replaceSeats: (state, action) => {
      const next = Array.isArray(action.payload) ? action.payload : state.seats
      state.seats = next
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeats.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchSeats.fulfilled, (state, action) => {
        state.seats = action.payload
        state.status = 'idle'
      })
      .addCase(bookSeatServer.fulfilled, (state, action) => {
        const seat = action.payload
        const idx = state.seats.findIndex((s) => s.id === seat.id)
        if (idx !== -1) state.seats[idx] = seat
      })
      .addCase(releaseSeatServer.fulfilled, (state, action) => {
        const seat = action.payload
        const idx = state.seats.findIndex((s) => s.id === seat.id)
        if (idx !== -1) state.seats[idx] = seat
      })
      .addCase(pairBookSeatsServer.fulfilled, (state, action) => {
        const booked = Array.isArray(action.payload) ? action.payload : []
        booked.forEach((seat) => {
          const idx = state.seats.findIndex((s) => s.id === seat.id)
          if (idx !== -1) state.seats[idx] = seat
        })
        state.status = 'idle'
      })
  },
})

export const { tick, applySeatUpdate, replaceSeats } = seatsSlice.actions
export default seatsSlice.reducer

export const selectSeats = (state) => state.seats.seats
export const selectSeatById = (state, id) => state.seats.seats.find((s) => s.id === id)