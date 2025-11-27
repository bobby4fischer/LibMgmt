import { createSlice } from '@reduxjs/toolkit'
import { createAsyncThunk } from '@reduxjs/toolkit'
import client from '../../api/client'

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
  extraReducers: (builder) => {
    builder
      .addCase(verifySession.pending, (state) => {
        if (!state.user) state.status = 'idle'
      })
      .addCase(verifySession.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'authenticated'
        try { localStorage.setItem('SeatSyncUser', JSON.stringify(state.user)) } catch {}
      })
      .addCase(verifySession.rejected, (state) => {
        state.user = null
        state.status = 'idle'
        try { localStorage.removeItem('SeatSyncUser') } catch {}
        try { localStorage.removeItem('SeatSyncToken') } catch {}
      })
  },
})

export const { loginSuccess, signupSuccess, logout } = authSlice.actions
export default authSlice.reducer

export const verifySession = createAsyncThunk('auth/me', async (_, thunkAPI) => {
  const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'
  if (offline) {
    try {
      const raw = localStorage.getItem('SeatSyncUser')
      const user = raw ? JSON.parse(raw) : null
      if (!user) throw new Error('No offline user')
      return user
    } catch {
      throw new Error('No offline user')
    }
  }
  const { data } = await client.get('/auth/me')
  return data.user
})