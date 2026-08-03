import { Routes, Route } from 'react-router-dom'
import SearchPage from './pages/SearchPage'
import SeatMapPage from './pages/SeatMapPage'
import CheckoutPage from './pages/CheckoutPage'
import Header from './components/Header'
import Footer from './components/Footer'

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/trip/:tripId/seats" element={<SeatMapPage />} />
          <Route path="/booking/:bookingId" element={<CheckoutPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}


export default App

