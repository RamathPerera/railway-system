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
  trainNumber: string;
  routeName: string;
  departureTime: string;
  totalCoaches: number;
  reservedCoaches: number;
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

  // 2. Find ALL routes that contain BOTH stations via RouteStop. Because the
  //    network is bidirectional (Route 1: Colombo->Badulla, Route 2:
  //    Badulla->Colombo), the same two stations exist on multiple routes with
  //    reversed stopOrder. We must scan every route and pick the one whose
  //    direction actually serves the requested journey.
  const routeStops = await RouteStop.findAll({
    where: { stationId: { [Op.in]: [origin, dest] } },
  });

  // Group stops by route.
  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const rs of routeStops) {
    const list = stopsByRoute.get(rs.routeId) ?? [];
    list.push(rs);
    stopsByRoute.set(rs.routeId, list);
  }

  let originStop: RouteStop | undefined;
  let destStop: RouteStop | undefined;
  let routeId: string | undefined;
  let foundBothStations = false;

  // 3. Loop through every route. A route is usable only if it contains BOTH
  //    stations AND the origin stop precedes the destination stop (i.e. the
  //    trip travels in the requested direction). If a route contains both
  //    stations but in the wrong direction, skip it and try the next route.
  for (const [rid, stops] of stopsByRoute) {
    const o = stops.find((s) => s.stationId === origin);
    const d = stops.find((s) => s.stationId === dest);
    if (o && d) {
      foundBothStations = true;
      if (Number(o.stopOrder) < Number(d.stopOrder)) {
        originStop = o;
        destStop = d;
        routeId = rid;
        break;
      }
    }
  }

  // No route contains both stations at all -> 404.
  if (!foundBothStations) {
    throw new TripSearchError('No route connects the two stations', 404);
  }

  // Routes contain both stations, but none travels in the requested direction
  // (e.g. searching Colombo->Badulla on a day only served by the return line).
  // Return an empty result set so the frontend shows "No trips found".
  if (!originStop || !destStop || !routeId) {
    return [];
  }


  // 4. Dynamic pricing: (dest_distance - origin_distance) * PRICE_PER_KM.
  const originDistance = Number(originStop.distanceFromOrigin);
  const destDistance = Number(destStop.distanceFromOrigin);
  const fare = Math.round((destDistance - originDistance) * PRICE_PER_KM * 100) / 100;



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
        include: [{ association: 'train' }, { association: 'route' }],
      },
      // Eager-load the trip's coach snapshot so we can surface live fleet
      // counts (total coaches + reserved coaches) on each search result.
      { association: 'coaches', required: false },
    ],
  });

  // 6. Map to the response shape.
  return trips.map((trip) => {
    const schedule = trip.get('schedule') as any;
    const train = schedule?.get?.('train') as any;
    const route = schedule?.get?.('route') as any;
    const coaches = (trip.get('coaches') as any[] | undefined) ?? [];
    const totalCoaches = coaches.length;
    const reservedCoaches = coaches.filter((c) => c?.classType === 'Reserved').length;
    return {
      id: trip.id,
      departureDate: trip.departureDate,
      status: trip.status,
      trainName: train?.name ?? 'Unknown',
      trainNumber: train?.number ?? '',
      routeName: route?.name ?? '',
      departureTime: schedule?.departureTime ?? '',
      totalCoaches,
      reservedCoaches,
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

  // --- Step B: Paginate ALL coaches for this trip (Reserved + Unreserved) so
  // the frontend can visually represent the entire physical train. ---
  const offset = (page - 1) * limit;
  const { rows: coaches, count: totalCoaches } = await TripCoach.findAndCountAll({
    where: { tripId },
    // Order coaches by coachNo, and each coach's seats by seatNo ascending so
    // the seat map renders in a deterministic, sequential layout.
    order: [
      ['coachNo', 'ASC'],
      [{ model: TripSeat, as: 'seats' }, 'seatNo', 'ASC'],
    ],
    limit,
    offset,
    distinct: true,
    // --- Step C: Eager-load the TripSeat snapshot for each paginated coach. ---
    include: [{ association: 'seats', required: false }],
  });



  // --- Step D: Find all segments that overlap the requested range and whose
  // parent Booking is CONFIRMED OR (PENDING with an active expiry). ---
  // Segment-aware locking: a pending booking for a different segment must NOT
  // mark this seat as unavailable.
  const now = new Date();
  const overlappingSegments = await BookingSegment.findAll({
    where: { tripId },
    include: [
      {
        association: 'booking',
        where: {
          [Op.or]: [
            { status: 'CONFIRMED' },
            { status: 'PENDING', expiresAt: { [Op.gt]: now } },
          ],
        },
        attributes: ['status'],
      },
      { association: 'startStop', attributes: ['stopOrder'] },
      { association: 'endStop', attributes: ['stopOrder'] },
    ],
  });

  const bookedSeatIds = new Set<string>();
  const pendingSeatIds = new Set<string>();
  for (const segment of overlappingSegments) {
    const segStart = Number((segment.get('startStop') as any)?.stopOrder);
    const segEnd = Number((segment.get('endStop') as any)?.stopOrder);
    // Overlap rule: existing_start < requested_end AND existing_end > requested_start.
    if (segStart < endOrder && segEnd > startOrder) {
      const bookingStatus = (segment.get('booking') as any)?.status;
      if (bookingStatus === 'CONFIRMED') {
        bookedSeatIds.add(segment.tripSeatId);
      } else {
        pendingSeatIds.add(segment.tripSeatId);
      }
    }
  }

  // --- Step E: Map each seat to its visual state. ---
  // Precedence: BOOKED (Red) > PENDING (Yellow) > AVAILABLE (Green).
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
        } else if (pendingSeatIds.has(seat.id)) {
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

