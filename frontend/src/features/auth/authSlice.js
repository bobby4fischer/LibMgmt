import { createSlice } from '@reduxjs/toolkit'

const persisted = (() => {
  try {
    const raw = localStorage.getItem('SeatSyncUser')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
})()

const initialState = {
  user: persisted,
  status: persisted ? 'authenticated' : 'idle', // 'idle' | 'authenticated'
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload
      state.status = 'authenticated'
      try { localStorage.setItem('SeatSyncUser', JSON.stringify(state.user)) } catch {}
    },
    signupSuccess: (state, action) => {
      state.user = action.payload
      state.status = 'authenticated'
      try { localStorage.setItem('SeatSyncUser', JSON.stringify(state.user)) } catch {}
    },
    logout: (state) => {
      state.user = null
      state.status = 'idle'
      try { localStorage.removeItem('SeatSyncUser') } catch {}
      try { localStorage.removeItem('SeatSyncToken') } catch {}
    },
  },
})

export const { loginSuccess, signupSuccess, logout } = authSlice.actions
export default authSlice.reducer