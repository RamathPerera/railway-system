import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, X, CheckCircle2 } from 'lucide-react'
import { getTripSeats, createBooking } from '../services/api'
import type { Coach, Seat } from '../types'


function SeatMapPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [searchParams] = useSearchParams()
  const start = searchParams.get('start') ?? ''
  const end = searchParams.get('end') ?? ''
  const navigate = useNavigate()

  const [activeCoachId, setActiveCoachId] = useState<string | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [passengerName, setPassengerName] = useState('')
  const [passengerEmail, setPassengerEmail] = useState('')

  const seatMapQuery = useQuery({
    queryKey: ['seatmap', tripId, start, end],
    queryFn: () => getTripSeats(tripId!, start, end, 1, 100),
    enabled: Boolean(tripId && start && end),
  })

  const coaches: Coach[] = seatMapQuery.data?.coaches ?? []
  const activeCoach = coaches.find((coach) => coach.id === activeCoachId) ?? coaches[0]

  const toggleSeat = (seatId: string) => {
    setSelectedSeats((prev) => {
      // Clicking the already-selected seat deselects it (radio-button toggle off).
      if (prev.includes(seatId)) {
        return []
      }
      // Clicking a different seat silently replaces the current selection.
      return [seatId]
    })

  }


  const createBookingMutation = useMutation({
    mutationFn: () =>
      createBooking({
        tripId: tripId!,
        startStationId: start,
        endStationId: end,
        seatIds: selectedSeats,
        passengerName,
        passengerEmail,
      }),
    onSuccess: (data) => {
      toast.success('Booking created successfully')
      setIsModalOpen(false)
      setSelectedSeats([])
      setPassengerName('')
      setPassengerEmail('')
      navigate(`/booking/${data.booking.id}`)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking')
    },
  })

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passengerName.trim() || !passengerEmail.trim()) {
      toast.error('Please provide your name and email')
      return
    }
    createBookingMutation.mutate()
  }

  const seatClass = (seat: Seat): string => {
    const isSelected = selectedSeats.includes(seat.id)
    if (isSelected) {
      return 'bg-blue-600 text-white ring-2 ring-blue-600'
    }
    switch (seat.status) {
      case 'AVAILABLE':
        return 'bg-green-500 text-white hover:bg-green-600'
      case 'BOOKED':
        return 'bg-red-500 text-white cursor-not-allowed'
      case 'PENDING':
        return 'bg-yellow-400 text-white cursor-not-allowed'
    }
  }

  return (

    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary via-primary-dark to-slate-900 px-4 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <h1 className="heading-1 text-white">Select Your Seats</h1>
          <p className="mt-2 text-slate-200">
            Trip <span className="font-semibold">{tripId}</span> · Start:{' '}
            <span className="font-semibold">{start}</span> · End:{' '}
            <span className="font-semibold">{end}</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {seatMapQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-body">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading seat map...
          </div>
        )}

        {seatMapQuery.isError && (
          <div className="card-container text-center text-body">
            Failed to load the seat map. Please try again.
          </div>
        )}

        {seatMapQuery.isSuccess && coaches.length === 0 && (
          <div className="card-container text-center text-body">No coaches available for this trip.</div>
        )}

        {seatMapQuery.isSuccess && coaches.length > 0 && activeCoach && (
          <>
            {/* Coach Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {coaches.map((coach) => {
                const isActive = coach.id === activeCoach.id
                return (
                  <button
                    key={coach.id}
                    type="button"
                    onClick={() => setActiveCoachId(coach.id)}
                    className={isActive ? 'btn-primary whitespace-nowrap' : 'btn-outline whitespace-nowrap'}
                  >
                    Coach {coach.coachNo}
                  </button>

                )
              })}
            </div>

            {/* Seat Grid */}
            <div className="card-container mt-4">
              <h2 className="heading-3 mb-4">
                Coach {activeCoach.coachNo} · {activeCoach.classType}
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {activeCoach.seats.map((seat, index) => (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={seat.status !== 'AVAILABLE' && !selectedSeats.includes(seat.id)}
                    onClick={() => toggleSeat(seat.id)}
                    className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                      index % 4 === 2 ? 'mr-8' : ''
                    } ${seatClass(seat)}`}
                  >
                    {seat.seatNo}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-body">
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-green-500" /> Available
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-red-500" /> Booked
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-yellow-400" /> Pending
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-blue-600" /> Selected
                </span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Fixed Bottom Bar */}
      {seatMapQuery.isSuccess && coaches.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <p className="text-sm text-body">
              Total Seats Selected:{' '}
              <span className="font-bold text-heading">{selectedSeats.length}</span>
            </p>
            <button
              type="button"
              className="btn-primary"
              disabled={selectedSeats.length === 0}
              onClick={() => setIsModalOpen(true)}
            >
              Proceed to Book
            </button>
          </div>
        </div>
      )}

      {/* Passenger Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card-container w-full max-w-md">
            <div className="flex items-center justify-between">
              <h2 className="heading-3">Passenger Details</h2>
              <button
                type="button"
                className="text-body hover:text-heading"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. John Doe"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. john@example.com"
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <p className="text-sm text-body">
                  Seats: <span className="font-semibold text-heading">{selectedSeats.length}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={createBookingMutation.isPending}
                  >
                    {createBookingMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm Booking
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SeatMapPage
