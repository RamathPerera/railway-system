import { Routes, Route } from 'react-router-dom'
import SearchPage from './pages/SearchPage'
import SeatMapPage from './pages/SeatMapPage'
import CheckoutPage from './pages/CheckoutPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/trip/:tripId/seats" element={<SeatMapPage />} />
      <Route path="/booking/:bookingId" element={<CheckoutPage />} />
    </Routes>
  )
}


export default App
