import { useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { bookSeatServer, releaseSeatServer, selectSeatById } from '../features/seats/seatsSlice'
import './SeatPopover.css'

export default function SeatPopover({ seatId, onClose }) {
  const seat = useSelector((s) => selectSeatById(s, seatId))
  const { user } = useSelector((s) => s.auth)
  const dispatch = useDispatch()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const remaining = useMemo(() => {
    if (!seat?.endTime) return null
    const ms = Math.max(0, seat.endTime - Date.now())
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h}h ${m}m ${s}s`
  }, [seat?.endTime])

  const canUnbook = seat?.bookedBy && user && seat.bookedBy === user.name

  const handleBook = async () => {
    if (!user) return
    setError('')
    setIsSubmitting(true)
    try {
      await dispatch(bookSeatServer({ seatId, minutes: 150 })).unwrap()
      onClose()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to book seat'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnbook = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await dispatch(releaseSeatServer({ seatId })).unwrap()
      onClose()
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to release seat'
      setError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!seat) return null

  return (
    <div className="popover-overlay" onClick={onClose}>
      <div className="popover" onClick={(e) => e.stopPropagation()}>
        <div className="popover-header">
          <h3>Seat {seat.number}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="popover-body">
          {seat.bookedBy ? (
            <>
              {seat.friendLabel ? (
                <>
                  <div>Assigned friend: <strong>{seat.friendLabel}</strong></div>
                  <div>Booking owner: <strong>{seat.bookedBy}</strong></div>
                </>
              ) : (
                <div>Booked by: <strong>{seat.bookedBy}</strong></div>
              )}
              <div>Time left: <strong>{remaining}</strong></div>
              {canUnbook && (
                <button className="danger-btn" onClick={handleUnbook} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="loading-inline">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
                        <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                        <path d="M12 2a10 10 0 1 1-10 10" />
                      </svg>
                      Releasing...
                    </span>
                  ) : 'Release seat'}
                </button>
              )}
              {error && <div className="error">{error}</div>}
            </>
          ) : (
            <>
              <div>This seat is currently available.</div>
              <div>Max booking: <strong>2.5 hours</strong></div>
              {user ? (
                <button className="primary-btn" onClick={handleBook} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <span className="loading-inline">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin">
                        <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                        <path d="M12 2a10 10 0 1 1-10 10" />
                      </svg>
                      Booking...
                    </span>
                  ) : 'Book for 2.5 hours'}
                </button>
              ) : (
                <div className="hint">Login to book seats.</div>
              )}
              {error && <div className="error">{error}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}