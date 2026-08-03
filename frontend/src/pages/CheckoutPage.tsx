import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  CreditCard,
  Loader2,
  User,
  Mail,
  Train,
  Clock,
  MapPin,
  Armchair,
  CheckCircle2,
  XCircle,
  Timer,
  ArrowLeft,
} from 'lucide-react'

import { getBooking, confirmBooking, cancelBooking } from '../services/api'

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(value)

const formatCountdown = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [remainingMs, setRemainingMs] = useState<number | null>(null)

  const bookingQuery = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => getBooking(bookingId!),
    enabled: Boolean(bookingId),
  })

  const booking = bookingQuery.data

  // Live countdown for PENDING bookings.
  useEffect(() => {
    if (!booking || booking.status !== 'PENDING' || !booking.expiresAt) {
      setRemainingMs(null)
      return
    }

    const expiresAt = new Date(booking.expiresAt).getTime()
    const tick = () => setRemainingMs(expiresAt - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [booking])

  const isExpired = remainingMs !== null && remainingMs <= 0

  const confirmMutation = useMutation({
    mutationFn: () => confirmBooking(bookingId!),
    onSuccess: () => {
      toast.success('Payment confirmed')
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
      setTimeout(() => navigate('/'), 1500)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to confirm payment')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(bookingId!),
    onSuccess: () => {
      toast.success('Booking cancelled')
      navigate('/')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking')
    },
  })

  if (bookingQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-body">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          Loading booking details...
        </div>
      </div>
    )
  }

  if (bookingQuery.isError || !booking) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="card-container text-center text-body">
          Failed to load booking details. Please try again.
        </div>
      </div>
    )
  }

  const firstSegment = booking.segments[0]
  const lastSegment = booking.segments[booking.segments.length - 1]
  const trainName = firstSegment?.trip.trainName ?? 'Unknown'
  const departureTime = firstSegment?.trip.departureTime ?? '—'
  const route = `${firstSegment?.startStation ?? '—'} → ${lastSegment?.endStation ?? '—'}`
  const seatNumbers = booking.segments.map((segment) => segment.seatNo)

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-body transition-colors hover:bg-slate-100 hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h1 className="heading-2 mb-6">Checkout</h1>


      {/* Status banner */}
      {booking.status === 'CONFIRMED' && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-100 px-4 py-3 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Payment Confirmed</span>
        </div>
      )}
      {booking.status === 'CANCELLED' && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-slate-700">
          <XCircle className="h-5 w-5" />
          <span className="font-semibold">Booking Cancelled</span>
        </div>
      )}
      {booking.status === 'PENDING' && isExpired && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-100 px-4 py-3 text-red-800">
          <Timer className="h-5 w-5" />
          <span className="font-semibold">Booking Expired</span>
        </div>
      )}

      {/* Ticket Summary */}
      <div className="card-container">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 className="heading-3">Ticket Summary</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
            {booking.status}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-heading">{booking.passengerName}</p>
              <p className="flex items-center gap-1 text-sm text-body">
                <Mail className="h-3.5 w-3.5" /> {booking.passengerEmail}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Train className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Train</p>
                <p className="font-semibold text-heading">{trainName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Departure</p>
                <p className="font-semibold text-heading">{departureTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Route</p>
                <p className="font-semibold text-heading">{route}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Armchair className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Seats</p>
                <p className="font-semibold text-heading">{seatNumbers.join(', ')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <p className="text-body">Total Fare</p>
            <p className="text-2xl font-bold text-heading">{formatCurrency(booking.totalFare)}</p>
          </div>
        </div>
      </div>

      {/* Countdown */}
      {booking.status === 'PENDING' && !isExpired && remainingMs !== null && (
        <div className="mt-6 flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3">
          <span className="flex items-center gap-2 font-medium text-heading">
            <Timer className="h-5 w-5 text-accent" /> Expires in
          </span>
          <span className="font-mono text-xl font-bold text-heading">
            {formatCountdown(remainingMs)}
          </span>
        </div>
      )}

      {/* Actions */}
      {booking.status === 'PENDING' && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-outline border-red-500 text-red-600 hover:bg-red-500 hover:text-white"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel Booking
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => confirmMutation.mutate()}
            disabled={confirmMutation.isPending || isExpired}
          >
            {confirmMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Confirm Payment
          </button>
        </div>
      )}
    </div>
  )
}

export default CheckoutPage
