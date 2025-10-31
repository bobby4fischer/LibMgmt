import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useSelector, useDispatch } from 'react-redux'
import { selectSeats, tick, fetchSeats, applySeatUpdate, replaceSeats } from '../features/seats/seatsSlice'
import SeatPopover from '../components/SeatPopover'
import './Dashboard.css'
import './Floor.css'
import '../components/Chair.css'
import { computeHallLayout, furniture } from './layout'

export default function Dashboard() {
  const seats = useSelector(selectSeats)
  const dispatch = useDispatch()
  const [selectedSeatId, setSelectedSeatId] = useState(null)

  useEffect(() => {
    dispatch(fetchSeats())
    const interval = setInterval(() => dispatch(tick()), 1000)
    // Wire up Socket.IO for real-time seat changes
    const token = localStorage.getItem('SeatSyncToken')
    const socket = io('http://localhost:5000', { auth: { token } })
    socket.on('seats:update', (seat) => {
      dispatch(applySeatUpdate(seat))
    })
    socket.on('seats:state', (list) => {
      if (Array.isArray(list)) dispatch(replaceSeats(list))
    })
    return () => {
      clearInterval(interval)
      socket.disconnect()
    }
  }, [dispatch])

  const placements = computeHallLayout(seats.length)

  return (
    <div className="dashboard">
      <h2>Library Hall</h2>
      <p className="hint">Click a seat to view booking details.</p>
      <div className="floor">
        <div className="seat-map">
          {furniture.map((f, i) => {
            const style = f.type === 'round'
              ? { left: f.x, top: f.y, width: f.size, height: f.size }
              : { left: f.x, top: f.y, width: f.width, height: f.height }
            return (
              <div key={`f-${i}`} className={`furniture ${f.type}`} style={style} />
            )
          })}
          {seats.map((seat, idx) => {
            const p = placements[idx] || { x: 100 + idx * 60, y: 100, rotate: 0 }
            return (
              <button
                key={seat.id}
                className={`seat-tile ${seat.bookedBy ? 'booked' : 'available'}`}
                onClick={() => setSelectedSeatId(seat.id)}
                style={{ left: p.x, top: p.y }}
              >
                <div className="seat-chair" style={{ ['--chair-rotate']: `${p.rotate}deg` }}>
                  <div className="chair-back" />
                  <div className="chair-seat" />
                  <div className="chair-legs"><div className="bar" /></div>
                  <div className="chair-label">{seat.number}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      {selectedSeatId && (
        <SeatPopover seatId={selectedSeatId} onClose={() => setSelectedSeatId(null)} />
      )}
    </div>
  )
}