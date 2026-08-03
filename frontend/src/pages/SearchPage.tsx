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
  Loader2,
  Route,
  LayoutGrid,
  BookMarked,
} from 'lucide-react'


import { getStations, searchTrips } from '../services/api'
import SearchableSelect from '../components/SearchableSelect'
import { getApiErrorMessage } from '../utils/apiErrors'
import type { Trip } from '../types'
import bgImage from '../assets/train-bg.webp'



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

  // Normalize the date so it is never null/empty during renders (e.g. after
  // browser autofill or back-navigation resets the input).
  const safeDate = date || toISODate(new Date())

  // Restrict booking window to today .. today + 7 days.
  const minDate = toISODate(new Date())
  const maxDate = toISODate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

  // Stations sorted alphabetically for a better dropdown UX.
  const sortedStations = [...(stationsQuery.data ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  )


  // Search query — only runs once the user submits the form (searchParams set).
  // The query key depends on searchParams, so it auto-fires on submit.
  const searchQuery = useQuery({
    queryKey: ['search', searchParams],
    queryFn: () => searchTrips(searchParams!.date, searchParams!.origin, searchParams!.dest),
    enabled: Boolean(searchParams),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!origin || !dest || !safeDate) {
      toast.error('Please select origin, destination, and date')
      return
    }

    if (origin === dest) {
      toast.error('Origin and destination cannot be the same')
      return
    }

    setSearchParams({ date: safeDate, origin, dest })
  }


  // Surface query errors via toast (extract the real backend message).
  if (searchQuery.isError) {
    toast.error(getApiErrorMessage(searchQuery.error, 'Failed to search trips'))
  }


  const trips: Trip[] = searchQuery.data ?? []

  // Resolve human-readable station names for the router state.
  const originName = stationsQuery.data?.find((s) => s.id === origin)?.name
  const destName = stationsQuery.data?.find((s) => s.id === dest)?.name


  return (
    <div className="min-h-screen">
      {/* ===== Hero Section ===== */}
      <section
        className="relative bg-cover bg-center px-4 py-20 text-white"
        style={{ backgroundImage: `url(${bgImage})` }}
      >

        {/* Dark gradient overlay so the search form pops out clearly */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/70 to-slate-900/90" />

        <div className="relative mx-auto max-w-4xl text-center">
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
              <SearchableSelect
                options={sortedStations}
                value={origin}
                onChange={setOrigin}
                disabled={stationsQuery.isLoading}
                placeholder="Select origin"
                label={
                  <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-heading">
                    <MapPin className="h-4 w-4 text-primary" /> Origin
                  </span>
                }
              />
            </div>

            <div>
              <SearchableSelect
                options={sortedStations}
                value={dest}
                onChange={setDest}
                disabled={stationsQuery.isLoading}
                placeholder="Select destination"
                label={
                  <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-heading">
                    <MapPin className="h-4 w-4 text-primary" /> Destination
                  </span>
                }
              />
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-heading">
                <Calendar className="h-4 w-4 text-primary" /> Date
              </label>
              <input
                type="date"
                className="input-field"
                value={safeDate}
                min={minDate}
                max={maxDate}
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
              <div
                key={trip.id}
                className="card-container flex flex-col gap-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Train className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    {/* Route Name -> (TrainName - TrainNumber) */}
                    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                      <Route className="h-3.5 w-3.5" /> {trip.routeName || 'Main Line'}
                    </p>
                    <h3 className="heading-3 mt-0.5">
                      {trip.trainName} <span className="font-normal text-body">- {trip.trainNumber}</span>
                    </h3>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-body">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-primary" />
                        Train Origin Departure:{' '}
                        <span className="font-semibold text-heading">{trip.departureTime}</span>
                      </span>
                    </div>


                    {/* Live coach badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        <LayoutGrid className="h-3.5 w-3.5" /> Total Coaches: {trip.totalCoaches}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        <BookMarked className="h-3.5 w-3.5" /> Reserved: {trip.reservedCoaches}
                      </span>
                      <span className="ml-auto text-lg font-bold text-heading">{formatFare(trip.fare)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-primary shrink-0"
                  onClick={() =>
                    navigate(`/trip/${trip.id}/seats?start=${origin}&end=${dest}`, {
                      state: {
                        trainName: trip.trainName,
                        trainNumber: trip.trainNumber,
                        routeName: trip.routeName,
                        originName,
                        destName,
                        date: trip.departureDate,
                      },
                    })
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
