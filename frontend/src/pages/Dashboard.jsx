import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useSelector, useDispatch } from 'react-redux'
import { selectSeats, tick, fetchSeats, applySeatUpdate, replaceSeats } from '../features/seats/seatsSlice'
import { pairBookSeatsServer } from '../features/seats/seatsSlice'
import SeatPopover from '../components/SeatPopover'
import './Dashboard.css'
import './Floor.css'
import '../components/Chair.css'
import { computeHallLayout, furniture } from './layout'

export default function Dashboard() {
  const seats = useSelector(selectSeats)
  const dispatch = useDispatch()
  const [selectedSeatId, setSelectedSeatId] = useState(null)
  const [pairMode, setPairMode] = useState(false)
  const [pairAId, setPairAId] = useState(null)
  const [pairBId, setPairBId] = useState(null)
  const [friendName, setFriendName] = useState('')
  const [pairMinutes, setPairMinutes] = useState(120)
  const [pairHint, setPairHint] = useState('')
  const [connStatus, setConnStatus] = useState('connecting')

  useEffect(() => {
    dispatch(fetchSeats())
    const interval = setInterval(() => dispatch(tick()), 1000)
    const offline = String(import.meta?.env?.VITE_OFFLINE_MODE || '').toLowerCase() === 'true'
    if (!offline) {
      const token = localStorage.getItem('SeatSyncToken')
      const socket = io('http://localhost:5000', { auth: { token }, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelayMax: 5000 })
      socket.on('connect', () => setConnStatus('connected'))
      socket.on('disconnect', () => setConnStatus('disconnected'))
      socket.on('connect_error', () => setConnStatus('error'))
      socket.on('reconnect', () => setConnStatus('connected'))
      socket.on('seats:update', (seat) => { dispatch(applySeatUpdate(seat)) })
      socket.on('seats:state', (list) => { if (Array.isArray(list)) dispatch(replaceSeats(list)) })
      return () => { clearInterval(interval); socket.disconnect() }
    } else {
      setConnStatus('offline')
    }
    return () => {
      clearInterval(interval)
    }
  }, [dispatch])

  const placements = computeHallLayout(seats.length)

  const isAvailable = (id) => {
    const s = seats.find((x) => x.id === id)
    return s && !s.bookedBy
  }

  const dist = (idA, idB) => {
    const a = placements[(idA || 0) - 1]
    const b = placements[(idB || 0) - 1]
    if (!a || !b) return Infinity
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }
  const ADJ_THRESHOLD = 130
  const isAdjacent = (idA, idB) => dist(idA, idB) <= ADJ_THRESHOLD

  const resetPair = () => {
    setPairAId(null); setPairBId(null); setFriendName(''); setPairHint('')
  }

  const onSeatClick = (seat) => {
    if (!pairMode) {
      setSelectedSeatId(seat.id)
      return
    }
    // Pair mode interactions
    if (!isAvailable(seat.id)) { setPairHint('Seat already booked. Choose an available seat.'); return }
    if (!pairAId) { setPairAId(seat.id); setPairHint('Select an adjacent seat for your friend.'); return }
    if (seat.id === pairAId) { resetPair(); setPairHint(''); return }
    if (!isAdjacent(pairAId, seat.id)) { setPairHint('Not adjacent. Pick a seat next to the first one.'); return }
    setPairBId(seat.id); setPairHint('Enter your friend’s name and book together.')
  }

  const submitPairBooking = async () => {
    if (!pairAId || !pairBId) { setPairHint('Pick two adjacent seats first.'); return }
    const name = friendName.trim()
    if (!name) { setPairHint('Please enter your friend’s name.'); return }
    setPairHint('Booking pair...')
    try {
      await dispatch(pairBookSeatsServer({ seatA: pairAId, seatB: pairBId, friendName: name, minutes: pairMinutes })).unwrap()
      setPairMode(false)
      resetPair()
      setPairHint('Pair booked successfully!')
      setTimeout(() => setPairHint(''), 1500)
    } catch (e) {
      const msg = (e && (e.message || e?.response?.data?.message)) || 'Pair booking failed.'
      setPairHint(msg)
    }
  }

  return (
    <div className="dashboard">
      {connStatus !== 'connected' && (
        <div className={`conn-banner ${connStatus}`}>{connStatus === 'connecting' ? 'Connecting…' : connStatus === 'error' ? 'Connection error — retrying' : 'Disconnected — attempting to reconnect'}</div>
      )}
      <h2>Library Hall</h2>
      <div className="toolbar">
        <button className={`pair-toggle ${pairMode ? 'on' : ''}`} onClick={() => { setPairMode((v) => !v); resetPair() }}>
          {pairMode ? 'Pair Booking: ON' : 'Pair Booking'}
        </button>
        {pairMode && (
          <div className="pair-panel">
            <div className="pair-status">
              <span>Step 1: pick your seat</span>
              <span>Step 2: pick adjacent friend seat</span>
            </div>
            <div className="pair-form">
              <input
                type="text"
                placeholder="Friend name"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
              />
              <input
                type="number"
                min={30}
                max={150}
                value={pairMinutes}
                onChange={(e) => setPairMinutes(Number(e.target.value) || 120)}
                title="Duration in minutes"
              />
              <button className="pair-book-btn" onClick={submitPairBooking} disabled={!pairAId || !pairBId}>Book Together</button>
              <button className="pair-cancel-btn" onClick={() => { setPairMode(false); resetPair() }}>Cancel</button>
            </div>
            {pairHint && <div className="pair-hint">{pairHint}</div>}
          </div>
        )}
      </div>
      <p className="hint">{pairMode ? 'Pair booking: choose two adjacent available seats.' : 'Click a seat to view booking details.'}</p>
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
            const candidate = pairMode && pairAId && isAvailable(seat.id) && isAdjacent(pairAId, seat.id)
            const selected = pairMode && (seat.id === pairAId || seat.id === pairBId)
            return (
              <button
                key={seat.id}
                className={`seat-tile ${seat.bookedBy ? 'booked' : 'available'} ${candidate ? 'pair-candidate' : ''} ${selected ? 'pair-selected' : ''}`}
                onClick={() => onSeatClick(seat)}
                style={{ left: p.x, top: p.y }}
              >
                <div className="seat-chair" style={{ ['--chair-rotate']: `${p.rotate}deg` }}>
                  <div className="chair-back" />
                  <div className="chair-seat" />
                  <div className="chair-legs"><div className="bar" /></div>
                  <div className="chair-label">{seat.friendLabel || seat.number}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      {!pairMode && selectedSeatId && (
        <SeatPopover seatId={selectedSeatId} onClose={() => setSelectedSeatId(null)} />
      )}
    </div>
  )
}