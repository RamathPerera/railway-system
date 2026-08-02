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
