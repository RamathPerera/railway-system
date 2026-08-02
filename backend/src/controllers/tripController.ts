import type { Request, Response } from 'express';
import { searchTrips, TripSearchError } from '../services/tripService.js';
import { searchTripsSchema } from '../utils/validation.js';


export const searchTripsHandler = async (req: Request, res: Response) => {
  const parsed = searchTripsSchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { date, origin, dest } = parsed.data;

  try {
    const trips = await searchTrips(date, origin, dest);
    return res.json({ trips });
  } catch (error) {
    if (error instanceof TripSearchError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('❌ Failed to search trips:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
