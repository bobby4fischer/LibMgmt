import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import seatsReducer from '../features/seats/seatsSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    seats: seatsReducer,
  },
})

export default store