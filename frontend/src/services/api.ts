import axios from 'axios';
import type {
  Station,
  Trip,
  TripSeatMap,
  CreateBookingRequest,
  CreateBookingResponse,
  Booking,
  BookingLifecycleResponse,
} from '../types';

// Shared Axios instance configured with the backend base URL.
// The value is read from the frontend .env file (VITE_API_BASE_URL).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
});

// GET /stations
export const getStations = async (): Promise<Station[]> => {
  const { data } = await api.get<{ stations: Station[] }>('/stations');
  return data.stations;
};

// GET /trips?date=...&origin=...&dest=...
export const searchTrips = async (
  date: string,
  origin: string,
  dest: string
): Promise<Trip[]> => {
  const { data } = await api.get<{ trips: Trip[] }>('/trips', {
    params: { date, origin, dest },
  });
  return data.trips;
};

// GET /trips/:tripId/seats?start=...&end=...&page=...&limit=...
export const getTripSeats = async (
  tripId: string,
  start: string,
  end: string,
  page = 1,
  limit = 1
): Promise<TripSeatMap> => {
  const { data } = await api.get<TripSeatMap>(`/trips/${tripId}/seats`, {
    params: { start, end, page, limit },
  });
  return data;
};

// POST /bookings
export const createBooking = async (
  bookingData: CreateBookingRequest
): Promise<CreateBookingResponse> => {
  const { data } = await api.post<CreateBookingResponse>('/bookings', bookingData);
  return data;
};

// GET /bookings/:id
export const getBooking = async (bookingId: string): Promise<Booking> => {
  const { data } = await api.get<{ booking: Booking }>(`/bookings/${bookingId}`);
  return data.booking;
};

// PATCH /bookings/:id/pay
export const confirmBooking = async (bookingId: string): Promise<BookingLifecycleResponse> => {
  const { data } = await api.patch<BookingLifecycleResponse>(`/bookings/${bookingId}/pay`);
  return data;
};

// PATCH /bookings/:id/cancel
export const cancelBooking = async (bookingId: string): Promise<BookingLifecycleResponse> => {
  const { data } = await api.patch<BookingLifecycleResponse>(`/bookings/${bookingId}/cancel`);
  return data;
};
