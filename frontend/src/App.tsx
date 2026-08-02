import { Routes, Route } from 'react-router-dom'
import SearchPage from './pages/SearchPage'
import SeatMapPage from './pages/SeatMapPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/trip/:tripId/seats" element={<SeatMapPage />} />
    </Routes>
  )
}

export default App
