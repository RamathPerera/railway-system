import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MapPin,
  Calendar,
  Train,
  Search,
  ArrowRight,
  Clock,
  IndianRupee,
  Loader2,
} from 'lucide-react'
import { getStations, searchTrips } from '../services/api'
import type { Trip } from '../types'

// Returns today's date in YYYY-MM-DD (local time).
const toISODate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatFare = (fare: number): string => `LKR ${fare.toFixed(2)}`

interface SearchParams {
  date: string
  origin: string
  dest: string
}

function SearchPage() {
  const navigate = useNavigate()

  const [origin, setOrigin] = useState('')
  const [dest, setDest] = useState('')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null)

  // Fetch the station list on mount (no useEffect).
  const stationsQuery = useQuery({
    queryKey: ['stations'],
    queryFn: getStations,
  })

  // Search query — disabled until the user submits the form.
  const searchQuery = useQuery({
    queryKey: ['search', searchParams],
    queryFn: () => searchTrips(searchParams!.date, searchParams!.origin, searchParams!.dest),
    enabled: false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!origin || !dest || !date) {
      toast.error('Please select origin, destination, and date')
      return
    }

    if (origin === dest) {
      toast.error('Origin and destination cannot be the same')
      return
    }

    setSearchParams({ date, origin, dest })
    searchQuery.refetch()
  }

  // Surface query errors via toast.
  if (searchQuery.isError) {
    toast.error(searchQuery.error instanceof Error ? searchQuery.error.message : 'Failed to search trips')
  }

  const trips: Trip[] = searchQuery.data ?? []

  return (
    <div className="min-h-screen">
      {/* ===== Hero Section ===== */}
      <section className="bg-gradient-to-br from-primary via-primary-dark to-slate-900 px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="heading-1 text-white">Book Your Railway Journey</h1>
          <p className="mt-3 text-lg text-slate-200">
            Search trains, compare fares, and reserve your seat in seconds.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSubmit}
            className="card-container mt-8 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-heading">
                <MapPin className="h-4 w-4 text-primary" /> Origin
              </label>
              <select
                className="input-field"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                disabled={stationsQuery.isLoading}
              >
                <option value="">Select origin</option>
                {stationsQuery.data?.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-heading">
                <MapPin className="h-4 w-4 text-primary" /> Destination
              </label>
              <select
                className="input-field"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                disabled={stationsQuery.isLoading}
              >
                <option value="">Select destination</option>
                {stationsQuery.data?.map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-heading">
                <Calendar className="h-4 w-4 text-primary" /> Date
              </label>
              <input
                type="date"
                className="input-field"
                value={date}
                min={toISODate(new Date())}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="btn-primary w-full"
                disabled={searchQuery.isFetching}
              >
                {searchQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ===== Results Section ===== */}
      <section className="mx-auto max-w-4xl px-4 py-10">
        {searchQuery.isFetching && (
          <div className="flex items-center justify-center gap-2 py-10 text-body">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Searching for trains...
          </div>
        )}

        {!searchQuery.isFetching && searchQuery.isSuccess && trips.length === 0 && (
          <div className="card-container text-center text-body">
            No trains found for the selected route and date.
          </div>
        )}

        {!searchQuery.isFetching && trips.length > 0 && (
          <div className="space-y-4">
            <h2 className="heading-2">Available Trains</h2>
            {trips.map((trip) => (
              <div key={trip.id} className="card-container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Train className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="heading-3">{trip.trainName}</h3>
                    <div className="mt-1 flex items-center gap-4 text-sm text-body">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {trip.departureTime}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-heading">
                        <IndianRupee className="h-4 w-4" /> {formatFare(trip.fare)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    navigate(`/trip/${trip.id}/seats?start=${origin}&end=${dest}`)
                  }
                >
                  Select Seats <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default SearchPage
