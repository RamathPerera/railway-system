import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import jsPDF from 'jspdf'


import {
  CreditCard,
  Loader2,
  User,
  Mail,
  Train,
  Clock,
  Armchair,

  CheckCircle2,
  XCircle,
  Timer,
  Phone,

  IdCard,
  Download,
  Route,
} from 'lucide-react'

import { getBooking, confirmBooking, cancelBooking } from '../services/api'
import { getApiErrorMessage } from '../utils/apiErrors'


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

  // Generate and auto-download the E-Ticket PDF natively with jsPDF.
  // Tailwind v4 uses oklch() colors that html2canvas cannot parse, so we draw
  // the ticket directly with the jsPDF vector API instead of capturing the DOM.
  const downloadTicketPdf = (): void => {
    if (!booking) return

    const doc = new jsPDF()

    // 1. Header (Blue Background)

    doc.setFillColor(30, 64, 175) // Tailwind indigo-800 approx
    doc.rect(0, 0, 210, 40, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text('CeylonRail E-Ticket', 20, 25)
    doc.setFontSize(12)
    doc.text(`Booking Ref: ${booking.id.split('-')[0].toUpperCase()}`, 130, 25)

    // 1. Train Information
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.text('Train Information', 20, 60)

    doc.setFontSize(12)
    doc.text(`Train: ${trainName} (${trainNumber})`, 20, 75)
    doc.text(`Main Route: ${routeName}`, 20, 85)
    doc.text(`Date: ${departureDate}`, 20, 95)
    doc.text(`Origin Departure: ${departureTime}`, 20, 105)

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(20, 115, 190, 115)

    // 2. Journey & Booking Details
    doc.setFontSize(16)
    doc.text('Journey & Booking Details', 20, 130)

    doc.setFontSize(12)
    doc.text(`From: ${originName}`, 20, 145)
    doc.text(`To: ${destName}`, 20, 155)
    doc.text(`Seats Booked: ${seatNumbers.join(', ')}`, 20, 165)
    doc.text(`Total Fare: LKR ${booking.totalFare}`, 20, 175)
    doc.text(`Status: CONFIRMED`, 20, 185)

    // Divider
    doc.line(20, 195, 190, 195)

    // 3. Passenger Information
    doc.setFontSize(16)
    doc.text('Passenger Information', 20, 210)

    doc.setFontSize(12)
    doc.text(`Name: ${booking.passengerName}`, 20, 225)
    doc.text(`NIC: ${booking.nic}`, 20, 235)
    doc.text(`Mobile: ${booking.mobileNumber}`, 20, 245)
    doc.text(`Email: ${booking.passengerEmail}`, 20, 255)


    // Footer
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text('Thank you for choosing CeylonRail. Have a safe journey!', 105, 280, { align: 'center' })

    // 5. Save the PDF
    doc.save(`Train_Ticket_${bookingId}.pdf`)
    toast.success('E-Ticket Downloaded!')
  }



  const confirmMutation = useMutation({
    mutationFn: () => confirmBooking(bookingId!),
    onSuccess: () => {
      toast.success('Payment Successful! E-Ticket Downloaded.')
      // Clear the stale seat map cache so the seat turns Red (Booked) on the
      // next visit without requiring a hard refresh.
      queryClient.invalidateQueries({ queryKey: ['seatmap'] })
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] })
      downloadTicketPdf()
      // No auto-redirect — the user stays on the page and returns Home manually.
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to confirm payment'))
    },
  })


  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(bookingId!),
    onSuccess: () => {
      toast.success('Booking cancelled')
      // Clear the stale seat map cache so the seat turns Green (Available)
      // after the cancellation.
      queryClient.invalidateQueries({ queryKey: ['seatmap'] })
      navigate('/')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to cancel booking'))
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
  const trainNumber = firstSegment?.trip.trainNumber ?? ''
  const routeName = firstSegment?.trip.routeName ?? ''
  const departureTime = firstSegment?.trip.departureTime ?? '—'
  const departureDate = firstSegment?.trip.departureDate ?? '—'
  const originName = firstSegment?.startStation ?? '—'
  const destName = lastSegment?.endStation ?? '—'
  const seatNumbers = booking.segments.map((segment) => `${segment.seatCoachNo}${segment.seatNo}`)





  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
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

      {/* ===== E-Ticket ===== */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Ticket header */}
        <div className="flex items-center justify-between bg-gradient-to-br from-indigo-500 to-blue-500 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Train className="h-6 w-6" />
            <div>
              <p className="text-lg font-bold leading-tight">CeylonRail E-Ticket</p>
              <p className="text-xs text-indigo-100">Booking Ref: {booking.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {booking.status}
          </span>
        </div>

        <div className="p-6">
          {/* Route summary */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-body">From</p>
              <p className="text-lg font-bold text-heading">{firstSegment?.startStation ?? '—'}</p>
            </div>
            <div className="flex flex-1 items-center justify-center gap-2 text-primary">
              <span className="h-0.5 flex-1 rounded bg-primary/30" />
              <Route className="h-5 w-5" />
              <span className="h-0.5 flex-1 rounded bg-primary/30" />
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-body">To</p>
              <p className="text-lg font-bold text-heading">{lastSegment?.endStation ?? '—'}</p>
            </div>
          </div>

          {/* Train + departure */}
          <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Train className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Train</p>
                <p className="font-semibold text-heading">
                  {trainName} {trainNumber && <span className="font-normal text-body">- {trainNumber}</span>}
                </p>
                {routeName && <p className="text-xs text-body">{routeName}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Train Origin Departure</p>
                <p className="font-semibold text-heading">{departureTime}</p>
              </div>

            </div>
          </div>

          {/* Passenger details */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Passenger</p>
                <p className="font-semibold text-heading">{booking.passengerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Email</p>
                <p className="font-semibold text-heading">{booking.passengerEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Mobile</p>
                <p className="font-semibold text-heading">{booking.mobileNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IdCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">NIC</p>
                <p className="font-semibold text-heading">{booking.nic}</p>
              </div>
            </div>
          </div>

          {/* Seats + fare */}
          <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Armchair className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-body">Seats</p>
                <p className="font-semibold text-heading">{seatNumbers.join(', ')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-body">Total Fare</p>
              <p className="text-2xl font-bold text-heading">{formatCurrency(booking.totalFare)}</p>
            </div>
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

      {/* Download button + Back to Home for already-confirmed tickets */}
      {booking.status === 'CONFIRMED' && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            type="button"
            className="btn-outline"
            onClick={() => downloadTicketPdf()}
          >
            <Download className="h-4 w-4" /> Download E-Ticket
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      )}

    </div>
  )
}

export default CheckoutPage
