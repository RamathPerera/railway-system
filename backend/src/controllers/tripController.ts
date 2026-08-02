import type { Request, Response } from 'express';
import { searchTrips, getTripSeatMap, TripSearchError } from '../services/tripService.js';
import {
  searchTripsSchema,
  getTripSeatsParamsSchema,
  getTripSeatsQuerySchema,
} from '../utils/validation.js';



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

export const getTripSeatsHandler = async (req: Request, res: Response) => {
  const paramsParsed = getTripSeatsParamsSchema.safeParse(req.params);
  const queryParsed = getTripSeatsQuerySchema.safeParse(req.query);

  if (!paramsParsed.success || !queryParsed.success) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      params: paramsParsed.success ? undefined : paramsParsed.error.flatten().fieldErrors,
      query: queryParsed.success ? undefined : queryParsed.error.flatten().fieldErrors,
    });
  }

  const { tripId } = paramsParsed.data;
  const { start, end, page, limit } = queryParsed.data;

  try {
    const seatMap = await getTripSeatMap(tripId, start, end, page, limit);
    return res.json(seatMap);
  } catch (error) {
    if (error instanceof TripSearchError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('❌ Failed to fetch trip seat map:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

