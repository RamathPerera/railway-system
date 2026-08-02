import { z } from 'zod';

// Centralized Zod schemas for request validation.
// Keeping all schemas here provides a single source of truth for the API
// request contracts, reusable across controllers, routes, and tests.

// GET /api/trips?date=...&origin=...&dest=...
export const searchTripsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  origin: z.string().uuid('origin must be a valid station UUID'),
  dest: z.string().uuid('dest must be a valid station UUID'),
});

export type SearchTripsQuery = z.infer<typeof searchTripsSchema>;

// GET /api/trips/:tripId/seats?start=...&end=...&page=...&limit=...
export const getTripSeatsParamsSchema = z.object({
  tripId: z.string().uuid('tripId must be a valid trip UUID'),
});

export const getTripSeatsQuerySchema = z.object({
  start: z.string().uuid('start must be a valid station UUID'),
  end: z.string().uuid('end must be a valid station UUID'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).default(1),
});

export type GetTripSeatsParams = z.infer<typeof getTripSeatsParamsSchema>;
export type GetTripSeatsQuery = z.infer<typeof getTripSeatsQuerySchema>;

// POST /api/bookings
export const createBookingSchema = z.object({
  tripId: z.string().uuid('tripId must be a valid trip UUID'),
  startStationId: z.string().uuid('startStationId must be a valid station UUID'),
  endStationId: z.string().uuid('endStationId must be a valid station UUID'),
  // Kept as an array to support future multi-seat bookings, but restricted to
  // exactly one seat for now.
  seatIds: z.array(z.string().uuid('each seatId must be a valid seat UUID')).length(1, 'You can only book 1 seat per transaction for now'),

  passengerName: z.string().min(2, 'passengerName must be at least 2 characters'),
  passengerEmail: z.string().email('passengerEmail must be a valid email'),
});

export type CreateBookingBody = z.infer<typeof createBookingSchema>;

// GET /api/bookings/:id
export const getBookingByIdParamsSchema = z.object({
  id: z.string().uuid('id must be a valid booking UUID'),
});

export type GetBookingByIdParams = z.infer<typeof getBookingByIdParamsSchema>;



