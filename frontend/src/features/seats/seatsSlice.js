import { createSlice } from '@reduxjs/toolkit'
import client from '../../api/client'
import { createAsyncThunk } from '@reduxjs/toolkit'

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
  const { data } = await client.get('/seats')
  return data.seats
})

export const bookSeatServer = createAsyncThunk('seats/book', async ({ seatId, minutes }) => {
  const { data } = await client.post(`/seats/${seatId}/book`, { minutes })
  return data.seat
})

export const releaseSeatServer = createAsyncThunk('seats/release', async ({ seatId }) => {
  const { data } = await client.post(`/seats/${seatId}/release`)
  return data.seat
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
  },
})

export const { tick, applySeatUpdate, replaceSeats } = seatsSlice.actions
export default seatsSlice.reducer

export const selectSeats = (state) => state.seats.seats
export const selectSeatById = (state, id) => state.seats.seats.find((s) => s.id === id)