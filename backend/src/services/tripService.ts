import { Op } from 'sequelize';
import { Station, RouteStop, Trip } from '../models/index.js';

// Configurable fare constant (LKR per km). Falls back to 5.0 if not set.
const PRICE_PER_KM = Number(process.env.PRICE_PER_KM) || 5.0;

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

  // 3. Validate travel direction: origin must come before destination.
  const originOrder = Number(originStop.stopOrder);
  const destOrder = Number(destStop.stopOrder);
  if (originOrder >= destOrder) {
    throw new TripSearchError('Origin must be before destination on the route', 422);
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
