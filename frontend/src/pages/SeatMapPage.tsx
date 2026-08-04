import { useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { Loader2, X, CheckCircle2, ArrowLeft, TrainFront } from 'lucide-react'


import { getTripSeats, createBooking } from '../services/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import type { Coach, Seat } from '../types'



function SeatMapPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [searchParams] = useSearchParams()
  const start = searchParams.get('start') ?? ''
  const end = searchParams.get('end') ?? ''
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()


  // Human-readable names passed via router state (fallback for direct URL access).
  const state = location.state as
    | Partial<{
        trainName: string
        trainNumber: string
        routeName: string
        originName: string
        destName: string
        date: string
        departureTime: string
        totalCoaches: number
      }>
    | null
  const headerTrain = state?.trainName ?? tripId ?? 'Trip'
  const headerRoute =
    state?.originName && state?.destName ? `${state.originName} → ${state.destName}` : '—'
  const headerRouteName = state?.routeName ?? '—'
  const headerDate = state?.date ?? '—'
  const headerDepartureTime = state?.departureTime ?? '—'
  const headerTotalCoaches = state?.totalCoaches ?? '—'



  const [activeCoachId, setActiveCoachId] = useState<string | null>(null)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [passengerName, setPassengerName] = useState('')
  const [passengerEmail, setPassengerEmail] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [nic, setNic] = useState('')


  const seatMapQuery = useQuery({
    queryKey: ['seatmap', tripId, start, end],
    queryFn: () => getTripSeats(tripId!, start, end, 1, 100),
    enabled: Boolean(tripId && start && end),
  })

  const coaches: Coach[] = seatMapQuery.data?.coaches ?? []
  // Default to the first Reserved (bookable) coach so the initial selection is
  // never a disabled Unreserved car. Falls back to the first coach if none exist.
  const firstReservedCoach = coaches.find((coach) => coach.classType === 'Reserved')
  const activeCoach =
    coaches.find((coach) => coach.id === activeCoachId) ?? firstReservedCoach ?? coaches[0]


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
        mobileNumber,
        nic,
      }),
    onSuccess: (data) => {
      toast.success('Booking created successfully')
      setIsModalOpen(false)
      setSelectedSeats([])
      setPassengerName('')
      setPassengerEmail('')
      setMobileNumber('')
      setNic('')
      // Invalidate the seat map cache so the locked seat no longer shows as
      // Available (Green) if the user navigates back to this page.
      queryClient.invalidateQueries({ queryKey: ['seatmap'] })
      navigate(`/booking/${data.booking.id}`)
    },

    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to create booking'))
    },
  })


  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!passengerName.trim() || !passengerEmail.trim()) {
      toast.error('Please provide your name and email')
      return
    }
    if (!mobileNumber.trim() || !nic.trim()) {
      toast.error('Please provide your mobile number and NIC')
      return
    }
    createBookingMutation.mutate()
  }


  const seatClass = (seat: Seat): string => {
    const isSelected = selectedSeats.includes(seat.id)
    if (isSelected) {
      return 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white ring-2 ring-offset-2 ring-indigo-400'
    }
    switch (seat.status) {
      case 'AVAILABLE':
        return 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-600'
      case 'BOOKED':
        return 'bg-gradient-to-br from-rose-400 to-rose-500 text-white cursor-not-allowed'
      case 'PENDING':
        return 'bg-gradient-to-br from-amber-400 to-amber-500 text-white cursor-not-allowed'
    }
  }


  return (

    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="bg-gradient-to-br from-primary via-primary-dark to-slate-900 px-4 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 sm:flex-row sm:items-center">
          {/* Left: back + title + route */}
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mb-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h1 className="heading-1 text-white">Select Your Seats</h1>
            <p className="mt-2 text-slate-200">
              Train: <span className="font-semibold">{headerTrain}</span> ·{' '}
              <span className="font-semibold">{headerRoute}</span>
            </p>
            {headerRouteName !== '—' && (
              <p className="mt-1 text-sm text-slate-300">{headerRouteName}</p>
            )}
          </div>

          {/* Right: extra trip details */}
          <div className="flex flex-wrap gap-3 sm:justify-end">
            <div className="rounded-lg bg-white/10 px-4 py-2 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Departure Date</p>
              <p className="text-sm font-semibold text-white">{headerDate}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Departure Time</p>
              <p className="text-sm font-semibold text-white">{headerDepartureTime}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-4 py-2 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">Total Coaches</p>
              <p className="text-sm font-semibold text-white">{headerTotalCoaches}</p>
            </div>
          </div>
        </div>
      </header>



      <main className="mx-auto max-w-7xl px-4 py-8">

        {seatMapQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-body">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading seat map...
          </div>
        )}

        {seatMapQuery.isError && (
          <div className="card-container text-center text-body">
            {getApiErrorMessage(seatMapQuery.error, 'Failed to load the seat map. Please try again.')}
          </div>
        )}


        {seatMapQuery.isSuccess && coaches.length === 0 && (
          <div className="card-container text-center text-body">No coaches available for this trip.</div>
        )}

        {seatMapQuery.isSuccess && coaches.length > 0 && activeCoach && (
          <>
            {/* Train Visual — locomotive + connected coach cars */}
            <div className="overflow-x-auto pb-2">
              <div className="flex items-stretch">
                {/* Locomotive / Engine */}
                <div className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-3 text-white shadow-md">
                  <TrainFront size={32} className="-scale-x-100" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                    Engine
                  </span>
                </div>


                {/* Connector between engine and first car */}
                <div className="flex w-3 shrink-0 items-center">
                  <div className="h-1 w-full rounded bg-slate-300" />
                </div>

                {coaches.map((coach, index) => {
                  const isActive = coach.id === activeCoach.id
                  const isUnreserved = coach.classType === 'Unreserved'
                  return (
                    <div key={coach.id} className="flex shrink-0 items-stretch">
                      {index > 0 && (
                        <div className="flex w-3 shrink-0 items-center">
                          <div className="h-1 w-full rounded bg-slate-300" />
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={isUnreserved}
                        aria-disabled={isUnreserved}
                        title={isUnreserved ? 'Unreserved coach' : `Coach ${coach.coachNo}`}
                        onClick={() => setActiveCoachId(coach.id)}
                        className={`flex min-w-[88px] flex-col items-center justify-center gap-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                          isUnreserved
                            ? 'cursor-not-allowed border-slate-200 bg-gray-200 text-gray-500'
                            : isActive
                              ? 'scale-105 border-transparent bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-md'
                              : 'border-slate-200 bg-white text-heading shadow-sm hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        <span>Coach {coach.coachNo}</span>
                        <span
                          className={`text-[10px] font-medium uppercase tracking-wide ${
                            isUnreserved
                              ? 'text-gray-400'
                              : isActive
                                ? 'text-indigo-100'
                                : 'text-slate-400'
                          }`}
                        >
                          {isUnreserved ? 'Unreserved' : coach.classType}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>


            {/* Seat Grid — strict 2x2 layout with aisle */}
            <div className="card-container mt-4">
              <h2 className="heading-3 mb-4">
                Coach {activeCoach.coachNo} · {activeCoach.classType}
              </h2>

              {/* Failsafe: sort seats ascending so numbering is always sequential. */}
              {(() => {
                const sortedSeats = [...activeCoach.seats].sort((a, b) => a.seatNo - b.seatNo)
                const rows: Seat[][] = []
                for (let i = 0; i < sortedSeats.length; i += 4) {
                  rows.push(sortedSeats.slice(i, i + 4))
                }

                return (
                  <div className="mx-auto mt-8 flex max-w-lg flex-col gap-4">
                    {rows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="flex w-full items-center justify-between"
                      >
                        {/* Left side: seats 1 & 2 */}
                        <div className="flex gap-4">
                          {row.slice(0, 2).map((seat) => (
                            <button
                              key={seat.id}
                              type="button"
                              disabled={seat.status !== 'AVAILABLE' && !selectedSeats.includes(seat.id)}
                              onClick={() => toggleSeat(seat.id)}
                              className={`flex h-14 w-14 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-all duration-200 ${seatClass(seat)}`}
                            >
                              {activeCoach.coachNo}
                              {seat.seatNo}
                            </button>
                          ))}
                        </div>

                        {/* Aisle */}
                        <div className="w-12 text-center text-xs uppercase tracking-widest text-gray-400">
                          Aisle
                        </div>

                        {/* Right side: seats 3 & 4 */}
                        <div className="flex gap-4">
                          {row.slice(2, 4).map((seat) => (
                            <button
                              key={seat.id}
                              type="button"
                              disabled={seat.status !== 'AVAILABLE' && !selectedSeats.includes(seat.id)}
                              onClick={() => toggleSeat(seat.id)}
                              className={`flex h-14 w-14 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-all duration-200 ${seatClass(seat)}`}
                            >
                              {activeCoach.coachNo}
                              {seat.seatNo}
                            </button>
                          ))}
                        </div>

                      </div>
                    ))}
                  </div>
                )
              })()}


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
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">

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
                <label className="mb-1 block text-sm font-medium text-heading">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. John Doe"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="e.g. john@example.com"
                  value={passengerEmail}
                  onChange={(e) => setPassengerEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="e.g. 0771234567"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-heading">
                  NIC (National Identity Card) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. 200012345678"
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
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
