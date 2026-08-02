import type { Request, Response } from 'express';
import { createBooking, getBookingById, BookingError } from '../services/bookingService.js';
import { createBookingSchema, getBookingByIdParamsSchema } from '../utils/validation.js';


export const createBookingHandler = async (req: Request, res: Response) => {
  const parsed = createBookingSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { tripId, startStationId, endStationId, seatIds, passengerName, passengerEmail } = parsed.data;

  try {
    const result = await createBooking({
      tripId,
      startStationId,
      endStationId,
      seatIds,
      passengerName,
      passengerEmail,
    });
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof BookingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('❌ Failed to create booking:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getBookingHandler = async (req: Request, res: Response) => {
  const parsed = getBookingByIdParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request parameters',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { id } = parsed.data;

  try {
    const booking = await getBookingById(id);
    return res.json({ booking });
  } catch (error) {
    if (error instanceof BookingError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('❌ Failed to fetch booking:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

