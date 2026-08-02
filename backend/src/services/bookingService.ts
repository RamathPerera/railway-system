import { Op } from 'sequelize';
import {
  sequelize,
  Trip,
  RouteStop,
  TripSeat,
  Booking,
  BookingSegment,
} from '../models/index.js';
import { PRICE_PER_KM } from './tripService.js';

// Duration (ms) a seat remains locked while payment is in progress.
const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// Domain error carrying an HTTP status code so the controller can map it directly.
export class BookingError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'BookingError';
    this.statusCode = statusCode;
  }
}

export interface CreateBookingParams {
  tripId: string;
  startStationId: string;
  endStationId: string;
  seatIds: string[];
  passengerName: string;
  passengerEmail: string;
}

export interface CreateBookingResult {
  message: string;
  booking: {
    id: string;
    expiresAt: Date | null;
    totalFare: number;
    status: string;
  };
}

export const createBooking = async (
  params: CreateBookingParams
): Promise<CreateBookingResult> => {
  const { tripId, startStationId, endStationId, seatIds, passengerName, passengerEmail } = params;

  return sequelize.transaction(async (transaction) => {
    // --- Step A: Resolve the trip, route, segment ordering, and per-seat fare. ---
    const trip = await Trip.findByPk(tripId, {
      include: [{ association: 'schedule' }],
      transaction,
    });

    if (!trip) {
      throw new BookingError('Trip not found', 404);
    }

    const schedule = trip.get('schedule') as any;
    const routeId = schedule?.routeId as string | undefined;
    if (!routeId) {
      throw new BookingError('Trip has no associated route', 404);
    }

    const routeStops = await RouteStop.findAll({
      where: {
        routeId,
        stationId: { [Op.in]: [startStationId, endStationId] },
      },
      transaction,
    });

    const startStop = routeStops.find((rs) => rs.stationId === startStationId);
    const endStop = routeStops.find((rs) => rs.stationId === endStationId);

    if (!startStop || !endStop) {
      throw new BookingError('Start or end station is not on this trip route', 404);
    }

    const startOrder = Number(startStop.stopOrder);
    const endOrder = Number(endStop.stopOrder);
    if (startOrder >= endOrder) {
      throw new BookingError('Start station must be before end station on the route', 422);
    }

    const startDistance = Number(startStop.distanceFromOrigin);
    const endDistance = Number(endStop.distanceFromOrigin);
    const perSeatFare = Math.round((endDistance - startDistance) * PRICE_PER_KM * 100) / 100;

    // --- Step B: Acquire row locks on the requested seats (serializes concurrent requests). ---
    const seats = await TripSeat.findAll({
      where: { id: { [Op.in]: seatIds } },
      include: [
        {
          association: 'tripCoach',
          where: { tripId },
          attributes: [],
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (seats.length !== seatIds.length) {
      throw new BookingError('One or more requested seats were not found for this trip', 404);
    }

    // --- Step C: Concurrency verification for every requested seat. ---
    const now = new Date();

    // C1: Reject any seat that is currently locked by another user.
    const lockedSeat = seats.find((seat) => seat.lockedUntil && seat.lockedUntil > now);
    if (lockedSeat) {
      throw new BookingError('Seat(s) temporarily locked by another user', 409);
    }

    // C2: Reject any seat with an overlapping CONFIRMED booking for the requested segment.
    const overlappingSegments = await BookingSegment.findAll({
      where: { tripSeatId: { [Op.in]: seatIds } },
      include: [
        {
          association: 'booking',
          where: { status: 'CONFIRMED' },
          attributes: [],
        },
        { association: 'startStop', attributes: ['stopOrder'] },
        { association: 'endStop', attributes: ['stopOrder'] },
      ],
      transaction,
    });

    const hasOverlap = overlappingSegments.some((segment) => {
      const segStart = Number((segment.get('startStop') as any)?.stopOrder);
      const segEnd = Number((segment.get('endStop') as any)?.stopOrder);
      // Overlap rule: existing_start < requested_end AND existing_end > requested_start.
      return segStart < endOrder && segEnd > startOrder;
    });

    if (hasOverlap) {
      throw new BookingError('One or more seats are already booked for an overlapping segment', 409);
    }

    // --- Step D: Mutate state — lock seats, create the Booking and its BookingSegments. ---
    const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);
    const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
    const totalFare = Math.round(perSeatFare * seatIds.length * 100) / 100;

    await TripSeat.update(
      { lockedUntil },
      { where: { id: { [Op.in]: seatIds } }, transaction }
    );

    const booking = await Booking.create(
      {
        passengerName,
        passengerEmail,
        totalFare,
        status: 'PENDING',
        expiresAt,
      },
      { transaction }
    );

    await BookingSegment.bulkCreate(
      seatIds.map((tripSeatId) => ({
        bookingId: booking.id,
        tripId,
        tripSeatId,
        startStopId: startStop.id,
        endStopId: endStop.id,
        fare: perSeatFare,
      })),
      { transaction }
    );

    return {
      message: 'Seats successfully locked',
      booking: {
        id: booking.id,
        expiresAt: booking.expiresAt,
        totalFare: Number(booking.totalFare),
        status: booking.status,
      },
    };
  });
};
