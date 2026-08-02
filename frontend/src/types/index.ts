// Shared TypeScript types mirroring the backend API response shapes.

// GET /stations -> { stations: Station[] }
export interface Station {
  id: string;
  name: string;
  code: string;
}

// GET /trips -> { trips: Trip[] }
export interface Trip {
  id: string;
  departureDate: string;
  status: string;
  trainName: string;
  departureTime: string;
  fare: number;
}

// Seat visual states (matches backend SeatStatus).
export type SeatStatus = 'AVAILABLE' | 'PENDING' | 'BOOKED';

export interface Seat {
  id: string;
  seatNo: number;
  status: SeatStatus;
}

export interface Coach {
  id: string;
  coachNo: string;
  classType: string;
  seats: Seat[];
}

// GET /trips/:tripId/seats -> TripSeatMap (returned directly, not wrapped)
export interface TripSeatMap {
  tripId: string;
  meta: {
    currentPage: number;
    totalPages: number;
    totalCoaches: number;
    limit: number;
  };
  coaches: Coach[];
}

// POST /bookings request body
export interface CreateBookingRequest {
  tripId: string;
  startStationId: string;
  endStationId: string;
  seatIds: string[];
  passengerName: string;
  passengerEmail: string;
}

// POST /bookings -> CreateBookingResponse
export interface CreateBookingResponse {
  message: string;
  booking: {
    id: string;
    expiresAt: string | null;
    totalFare: number;
    status: string;
  };
}

// GET /bookings/:id -> { booking: Booking }
export interface BookingSegmentSummary {
  id: string;
  seatId: string;
  seatNo: number;
  fare: number;
  startStation: string;
  endStation: string;
  trip: {
    id: string;
    departureDate: string;
    status: string;
    trainName: string;
    departureTime: string;
  };
}

export interface Booking {
  id: string;
  passengerName: string;
  passengerEmail: string;
  totalFare: number;
  status: string;
  expiresAt: string | null;
  createdAt: string;
  segments: BookingSegmentSummary[];
}

// PATCH /bookings/:id/pay and /bookings/:id/cancel -> BookingLifecycleResponse
export interface BookingLifecycleResponse {
  message: string;
  booking: {
    id: string;
    status: string;
  };
}
