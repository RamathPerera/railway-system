import { useParams, useSearchParams } from 'react-router-dom'
import { Train } from 'lucide-react'

function SeatMapPage() {
  const { tripId } = useParams<{ tripId: string }>()
  const [searchParams] = useSearchParams()
  const start = searchParams.get('start') ?? ''
  const end = searchParams.get('end') ?? ''

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card-container text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Train className="h-7 w-7" />
        </div>
        <h1 className="heading-2 mt-4">Seat Map</h1>
        <p className="mt-2 text-body">
          Seat selection for trip <span className="font-semibold text-heading">{tripId}</span>
        </p>
        <p className="mt-1 text-sm text-body">
          Start: <span className="font-medium text-heading">{start}</span> · End:{' '}
          <span className="font-medium text-heading">{end}</span>
        </p>
        <p className="mt-6 text-sm text-body">Seat map coming soon.</p>
      </div>
    </div>
  )
}

export default SeatMapPage
