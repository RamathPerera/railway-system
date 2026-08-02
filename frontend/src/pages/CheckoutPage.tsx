import { useParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'

function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="card-container text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CreditCard className="h-7 w-7" />
        </div>
        <h1 className="heading-2 mt-4">Checkout</h1>
        <p className="mt-2 text-body">
          Booking <span className="font-semibold text-heading">{bookingId}</span>
        </p>
        <p className="mt-6 text-sm text-body">Checkout and payment coming soon.</p>
      </div>
    </div>
  )
}

export default CheckoutPage
