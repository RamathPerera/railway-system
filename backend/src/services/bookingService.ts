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
  mobileNumber: string;
  nic: string;
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
  const { tripId, startStationId, endStationId, seatIds, passengerName, passengerEmail, mobileNumber, nic } = params;


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
      throw new BookingError('Invalid segment direction', 422);
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
    // The row-level lock (SELECT ... FOR UPDATE) above serializes concurrent
    // requests on the same seats. Inside the lock we check for overlapping
    // segments whose parent Booking is CONFIRMED OR (PENDING with an active
    // expiry). Segment-aware: a pending booking on a different segment does not
    // block this seat.
    const now = new Date();

    const overlappingSegments = await BookingSegment.findAll({
      where: { tripSeatId: { [Op.in]: seatIds } },
      include: [
        {
          association: 'booking',
          where: {
            [Op.or]: [
              { status: 'CONFIRMED' },
              { status: 'PENDING', expiresAt: { [Op.gt]: now } },
            ],
          },
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
        mobileNumber,
        nic,
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

export interface BookingSegmentSummary {
  id: string;
  seatId: string;
  seatNo: number;
  seatCoachNo: string;
  fare: number;
  startStation: string;
  endStation: string;

  trip: {
    id: string;
    departureDate: string;
    status: string;
    trainName: string;
    trainNumber: string;
    routeName: string;
    departureTime: string;
  };
}

export interface BookingSummary {
  id: string;
  passengerName: string;
  passengerEmail: string;
  mobileNumber: string;
  nic: string;
  totalFare: number;
  status: string;
  expiresAt: Date | null;
  createdAt: Date;
  segments: BookingSegmentSummary[];
}


export const getBookingById = async (bookingId: string): Promise<BookingSummary> => {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      {
        association: 'segments',
        include: [
          { association: 'seat', include: [{ association: 'tripCoach' }] },

          {
            association: 'trip',
            include: [
              {
                association: 'schedule',
                include: [{ association: 'train' }, { association: 'route' }],
              },
            ],
          },

          {
            association: 'startStop',
            include: [{ association: 'station' }],
          },
          {
            association: 'endStop',
            include: [{ association: 'station' }],
          },
        ],
      },
    ],
  });

  if (!booking) {
    throw new BookingError('Booking not found', 404);
  }

  const segments = (booking.get('segments') as any[] | undefined) ?? [];

  return {
    id: booking.id,
    passengerName: booking.passengerName,
    passengerEmail: booking.passengerEmail,
    mobileNumber: booking.mobileNumber,
    nic: booking.nic,
    totalFare: Number(booking.totalFare),
    status: booking.status,
    expiresAt: booking.expiresAt,
    createdAt: booking.createdAt,
    segments: segments.map((segment) => {
      const seat = segment?.seat;
      const trip = segment?.trip;
      const schedule = trip?.schedule;
      const train = schedule?.train;
      const route = schedule?.route;
      const startStop = segment?.startStop;
      const endStop = segment?.endStop;
      return {
        id: segment.id,
        seatId: segment.tripSeatId,
        seatNo: seat?.seatNo ?? 0,
        seatCoachNo: seat?.tripCoach?.coachNo ?? '',
        fare: Number(segment.fare),
        startStation: startStop?.station?.name ?? 'Unknown',
        endStation: endStop?.station?.name ?? 'Unknown',

        trip: {
          id: trip?.id ?? '',
          departureDate: trip?.departureDate ?? '',
          status: trip?.status ?? '',
          trainName: train?.name ?? 'Unknown',
          trainNumber: train?.number ?? '',
          routeName: route?.name ?? '',
          departureTime: schedule?.departureTime ?? '',
        },
      };
    }),
  };

};

export interface BookingLifecycleResult {
  message: string;
  booking: {
    id: string;
    status: string;
  };
}

export const confirmBooking = async (bookingId: string): Promise<BookingLifecycleResult> => {
  return sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, { transaction });

    if (!booking) {
      throw new BookingError('Booking not found', 404);
    }

    if (booking.status !== 'PENDING') {
      throw new BookingError('Booking is not pending and cannot be confirmed', 400);
    }

    await booking.update({ status: 'CONFIRMED' }, { transaction });

    // Release the temporary locks — the seats are now permanently booked.
    const segments = await BookingSegment.findAll({
      where: { bookingId },
      attributes: ['tripSeatId'],
      transaction,
    });
    const seatIds = segments.map((segment) => segment.tripSeatId);
    if (seatIds.length > 0) {
      await TripSeat.update(
        { lockedUntil: null },
        { where: { id: { [Op.in]: seatIds } }, transaction }
      );
    }

    return {
      message: 'Booking confirmed',
      booking: { id: booking.id, status: booking.status },
    };
  });
};

export const cancelBooking = async (bookingId: string): Promise<BookingLifecycleResult> => {
  return sequelize.transaction(async (transaction) => {
    const booking = await Booking.findByPk(bookingId, { transaction });

    if (!booking) {
      throw new BookingError('Booking not found', 404);
    }

    if (booking.status === 'CANCELLED') {
      throw new BookingError('Booking is already cancelled', 400);
    }

    await booking.update({ status: 'CANCELLED' }, { transaction });

    // Release any temporary locks so the seats return to Available.
    const segments = await BookingSegment.findAll({
      where: { bookingId },
      attributes: ['tripSeatId'],
      transaction,
    });
    const seatIds = segments.map((segment) => segment.tripSeatId);
    if (seatIds.length > 0) {
      await TripSeat.update(
        { lockedUntil: null },
        { where: { id: { [Op.in]: seatIds } }, transaction }
      );
    }

    return {
      message: 'Booking cancelled',
      booking: { id: booking.id, status: booking.status },
    };
  });
};


