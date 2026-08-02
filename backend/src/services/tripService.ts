import { Op } from 'sequelize';
import { Station, RouteStop, Trip, TripCoach, TripSeat, BookingSegment, Booking } from '../models/index.js';


// Configurable fare constant (LKR per km). Falls back to 5.0 if not set.
export const PRICE_PER_KM = Number(process.env.PRICE_PER_KM) || 5.0;


// Domain error carrying an HTTP status code so the controller can map it directly.
export class TripSearchError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'TripSearchError';
    this.statusCode = statusCode;
  }
}

export interface TripSearchResult {
  id: string;
  departureDate: string;
  status: string;
  trainName: string;
  departureTime: string;
  fare: number;
}

export const searchTrips = async (
  date: string,
  origin: string,
  dest: string
): Promise<TripSearchResult[]> => {
  // 1. Resolve both stations; unknown station -> 404.
  const [originStation, destStation] = await Promise.all([
    Station.findByPk(origin),
    Station.findByPk(dest),
  ]);

  if (!originStation || !destStation) {
    throw new TripSearchError('Unknown origin or destination station', 404);
  }

  // 2. Find a route that contains BOTH stations via RouteStop.
  const routeStops = await RouteStop.findAll({
    where: { stationId: { [Op.in]: [origin, dest] } },
  });

  // Group stops by route and look for a route containing both stations.
  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const rs of routeStops) {
    const list = stopsByRoute.get(rs.routeId) ?? [];
    list.push(rs);
    stopsByRoute.set(rs.routeId, list);
  }

  let originStop: RouteStop | undefined;
  let destStop: RouteStop | undefined;
  let routeId: string | undefined;

  for (const [rid, stops] of stopsByRoute) {
    const o = stops.find((s) => s.stationId === origin);
    const d = stops.find((s) => s.stationId === dest);
    if (o && d) {
      originStop = o;
      destStop = d;
      routeId = rid;
      break;
    }
  }

  if (!originStop || !destStop || !routeId) {
    throw new TripSearchError('No route connects the two stations', 404);
  }

  // 3. Validate travel: only the same station is invalid. Trains may travel in
  //    either direction along the route (bidirectional travel).
  const originOrder = Number(originStop.stopOrder);
  const destOrder = Number(destStop.stopOrder);
  if (originOrder === destOrder) {
    throw new TripSearchError('Origin and destination must be different stations', 422);
  }

  // 4. Dynamic pricing: |dest_distance - origin_distance| * PRICE_PER_KM.
  const originDistance = Number(originStop.distanceFromOrigin);
  const destDistance = Number(destStop.distanceFromOrigin);
  const fare = Math.round(Math.abs(destDistance - originDistance) * PRICE_PER_KM * 100) / 100;


  // 5. Fetch all Scheduled trips for the date on this route.
  const trips = await Trip.findAll({
    where: {
      departureDate: date,
      status: 'Scheduled',
    },
    include: [
      {
        association: 'schedule',
        where: { routeId },
        include: [{ association: 'train' }],
      },
    ],
  });

  // 6. Map to the response shape.
  return trips.map((trip) => {
    const schedule = trip.get('schedule') as any;
    const train = schedule?.get?.('train') as any;
    return {
      id: trip.id,
      departureDate: trip.departureDate,
      status: trip.status,
      trainName: train?.name ?? 'Unknown',
      departureTime: schedule?.departureTime ?? '',
      fare,
    };
  });
};

export type SeatStatus = 'AVAILABLE' | 'PENDING' | 'BOOKED';

export interface SeatMapSeat {
  id: string;
  seatNo: number;
  status: SeatStatus;
}

export interface SeatMapCoach {
  id: string;
  coachNo: string;
  classType: string;
  seats: SeatMapSeat[];
}

export interface TripSeatMapResult {
  tripId: string;
  meta: {
    currentPage: number;
    totalPages: number;
    totalCoaches: number;
    limit: number;
  };
  coaches: SeatMapCoach[];
}

export const getTripSeatMap = async (
  tripId: string,
  startStationId: string,
  endStationId: string,
  page: number,
  limit: number
): Promise<TripSeatMapResult> => {
  // --- Step A: Validate the trip, its route, and the requested segment. ---
  const trip = await Trip.findByPk(tripId, {
    include: [{ association: 'schedule' }],
  });

  if (!trip) {
    throw new TripSearchError('Trip not found', 404);
  }

  const schedule = trip.get('schedule') as any;
  const routeId = schedule?.routeId as string | undefined;
  if (!routeId) {
    throw new TripSearchError('Trip has no associated route', 404);
  }

  const routeStops = await RouteStop.findAll({
    where: {
      routeId,
      stationId: { [Op.in]: [startStationId, endStationId] },
    },
  });

  const startStop = routeStops.find((rs) => rs.stationId === startStationId);
  const endStop = routeStops.find((rs) => rs.stationId === endStationId);

  if (!startStop || !endStop) {
    throw new TripSearchError('Start or end station is not on this trip route', 404);
  }

  const startOrder = Number(startStop.stopOrder);
  const endOrder = Number(endStop.stopOrder);
  if (startOrder === endOrder) {
    throw new TripSearchError('Start and end stations must be different', 422);
  }

  // Direction-agnostic requested range (trains may travel either way).
  const reqMin = Math.min(startOrder, endOrder);
  const reqMax = Math.max(startOrder, endOrder);

  // --- Step B: Paginate the Reserved coaches for this trip. ---
  // Unreserved coaches are not shown on the seat map.
  const offset = (page - 1) * limit;
  const { rows: coaches, count: totalCoaches } = await TripCoach.findAndCountAll({
    where: { tripId, classType: 'Reserved' },
    order: [['coachNo', 'ASC']],
    limit,
    offset,
    distinct: true,
    // --- Step C: Eager-load the TripSeat snapshot for each paginated coach. ---
    include: [{ association: 'seats', required: false }],
  });

  // --- Step D: Find all CONFIRMED segments that overlap the requested range. ---
  const confirmedSegments = await BookingSegment.findAll({
    where: { tripId },
    include: [
      {
        association: 'booking',
        where: { status: 'CONFIRMED' },
        attributes: [],
      },
      { association: 'startStop', attributes: ['stopOrder'] },
      { association: 'endStop', attributes: ['stopOrder'] },
    ],
  });

  const bookedSeatIds = new Set<string>();
  for (const segment of confirmedSegments) {
    const segStart = Number((segment.get('startStop') as any)?.stopOrder);
    const segEnd = Number((segment.get('endStop') as any)?.stopOrder);
    // Direction-agnostic overlap: existing range intersects the requested range.
    const exMin = Math.min(segStart, segEnd);
    const exMax = Math.max(segStart, segEnd);
    if (exMin < reqMax && exMax > reqMin) {
      bookedSeatIds.add(segment.tripSeatId);
    }
  }


  // --- Step E: Map each seat to its visual state. ---
  const now = new Date();
  const coachesPayload: SeatMapCoach[] = coaches.map((coach) => {
    const seats = (coach.get('seats') as TripSeat[] | undefined) ?? [];
    return {
      id: coach.id,
      coachNo: coach.coachNo,
      classType: coach.classType,
      seats: seats.map((seat) => {
        let status: SeatStatus = 'AVAILABLE';
        if (bookedSeatIds.has(seat.id)) {
          status = 'BOOKED';
        } else if (seat.lockedUntil && seat.lockedUntil > now) {
          status = 'PENDING';
        }
        return { id: seat.id, seatNo: seat.seatNo, status };
      }),
    };
  });

  const totalPages = Math.max(1, Math.ceil(totalCoaches / limit));

  return {
    tripId,
    meta: {
      currentPage: page,
      totalPages,
      totalCoaches,
      limit,
    },
    coaches: coachesPayload,
  };
};

