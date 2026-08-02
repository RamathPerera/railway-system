import {
  sequelize,
  Station,
  Route,
  RouteStop,
  Train,
  MasterCoach,
  Schedule,
  Trip,
  TripCoach,
  TripSeat,
  Booking,
  BookingSegment,
} from './models/index.js';

import { PRICE_PER_KM } from './services/tripService.js';

// Duration (ms) a seat remains locked while payment is in progress (10 minutes).
const LOCK_DURATION_MS = 10 * 60 * 1000;

// Helper to build an ISO date string (YYYY-MM-DD) offset by N days from today.
const dateOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Round a fare to 2 decimal places, matching the runtime pricing convention.
const roundFare = (value: number): number => Math.round(value * 100) / 100;

// The 27 real stations along the Colombo-Badulla Main Line, with cumulative
// distance (km) from Colombo Fort and their sequential stop order (1..27).
const STATIONS: Array<{ name: string; code: string; stopOrder: number; distanceFromOrigin: number }> = [
  { name: 'Colombo Fort', code: 'FOT', stopOrder: 1, distanceFromOrigin: 0 },
  { name: 'Maradana', code: 'MRD', stopOrder: 2, distanceFromOrigin: 2 },
  { name: 'Ragama', code: 'RGM', stopOrder: 3, distanceFromOrigin: 16 },
  { name: 'Gampaha', code: 'GPH', stopOrder: 4, distanceFromOrigin: 28 },
  { name: 'Veyangoda', code: 'VYG', stopOrder: 5, distanceFromOrigin: 38 },
  { name: 'Polgahawela', code: 'PLG', stopOrder: 6, distanceFromOrigin: 73 },
  { name: 'Rambukkana', code: 'RBK', stopOrder: 7, distanceFromOrigin: 85 },
  { name: 'Kadugannawa', code: 'KDG', stopOrder: 8, distanceFromOrigin: 105 },
  { name: 'Peradeniya', code: 'PDN', stopOrder: 9, distanceFromOrigin: 115 },
  { name: 'Kandy', code: 'KDT', stopOrder: 10, distanceFromOrigin: 121 },
  { name: 'Gampola', code: 'GPL', stopOrder: 11, distanceFromOrigin: 140 },
  { name: 'Nawalapitiya', code: 'NWP', stopOrder: 12, distanceFromOrigin: 156 },
  { name: 'Hatton', code: 'HAT', stopOrder: 13, distanceFromOrigin: 190 },
  { name: 'Kotagala', code: 'KTG', stopOrder: 14, distanceFromOrigin: 195 },
  { name: 'Talawakele', code: 'TLW', stopOrder: 15, distanceFromOrigin: 205 },
  { name: 'Watagoda', code: 'WTG', stopOrder: 16, distanceFromOrigin: 215 },
  { name: 'Nanu Oya', code: 'NNO', stopOrder: 17, distanceFromOrigin: 225 },
  { name: 'Radella', code: 'RDL', stopOrder: 18, distanceFromOrigin: 229 },
  { name: 'Pattipola', code: 'PTP', stopOrder: 19, distanceFromOrigin: 238 },
  { name: 'Ohiya', code: 'OHY', stopOrder: 20, distanceFromOrigin: 245 },
  { name: 'Idalgashinna', code: 'IDG', stopOrder: 21, distanceFromOrigin: 254 },
  { name: 'Haputale', code: 'HPT', stopOrder: 22, distanceFromOrigin: 262 },
  { name: 'Diyatalawa', code: 'DYT', stopOrder: 23, distanceFromOrigin: 268 },
  { name: 'Bandarawela', code: 'BDW', stopOrder: 24, distanceFromOrigin: 275 },
  { name: 'Ella', code: 'ELL', stopOrder: 25, distanceFromOrigin: 287 },
  { name: 'Demodara', code: 'DMD', stopOrder: 26, distanceFromOrigin: 293 },
  { name: 'Badulla', code: 'BDL', stopOrder: 27, distanceFromOrigin: 300 },
];

// Master coach template for the Udarata Menike: A, B, C Reserved; D-H Unreserved.
const MASTER_COACHES: Array<{ coachNo: string; classType: 'Reserved' | 'Unreserved' }> = [
  { coachNo: 'A', classType: 'Reserved' },
  { coachNo: 'B', classType: 'Reserved' },
  { coachNo: 'C', classType: 'Reserved' },
  { coachNo: 'D', classType: 'Unreserved' },
  { coachNo: 'E', classType: 'Unreserved' },
  { coachNo: 'F', classType: 'Unreserved' },
  { coachNo: 'G', classType: 'Unreserved' },
  { coachNo: 'H', classType: 'Unreserved' },
];

// Seat capacity per coach class.
const RESERVED_SEATS = 40;
const UNRESERVED_SEATS = 60;

const seed = async () => {
  try {
    // 0. Clean wipe: drop all tables and recreate them from the current schema.
    await sequelize.sync({ force: true });

    // 1. Wrap all data seeding in a single transaction so a failure rolls back
    //    the entire seed and never leaves a partial data state.
    await sequelize.transaction(async (t) => {
      // --- Stations & RouteStops (27 stations, Colombo-Badulla Main Line) ---
      const stations = await Station.bulkCreate(
        STATIONS.map(({ name, code }) => ({ name, code })),
        { transaction: t }
      );

      const mainLine = await Route.create({ name: 'Colombo-Badulla Main Line' }, { transaction: t });

      await RouteStop.bulkCreate(
        STATIONS.map((s, index) => ({
          routeId: mainLine.id,
          stationId: stations[index].id,
          stopOrder: s.stopOrder,
          distanceFromOrigin: s.distanceFromOrigin,
        })),
        { transaction: t }
      );

      // --- Train & Master Coaches (Udarata Menike, 8 coaches) ---
      const menike = await Train.create({ name: 'Udarata Menike', number: '1015' }, { transaction: t });

      const masterCoaches = await MasterCoach.bulkCreate(
        MASTER_COACHES.map((mc) => ({ trainId: menike.id, ...mc })),
        { transaction: t }
      );

      // --- Schedule (daily 08:30 departure) ---
      const schedule = await Schedule.create(
        { routeId: mainLine.id, trainId: menike.id, departureTime: '08:30:00' },
        { transaction: t }
      );

      // --- Trips (7 consecutive days starting today) ---
      const trips = await Trip.bulkCreate(
        Array.from({ length: 7 }, (_, i) => ({
          scheduleId: schedule.id,
          departureDate: dateOffset(i),
          status: 'Scheduled',
        })),
        { transaction: t }
      );

      // --- Trip snapshots: TripCoaches + TripSeats (bulk, ~2940 seats total) ---
      // For each trip, clone the 8 master coaches and generate their seats.
      // We track the Coach A seat IDs per trip so we can attach mock bookings.
      const coachASeatIdsByTrip: string[][] = [];

      for (const trip of trips) {
        const tripCoaches = await TripCoach.bulkCreate(
          MASTER_COACHES.map((mc) => ({
            tripId: trip.id,
            coachNo: mc.coachNo,
            classType: mc.classType,
          })),
          { transaction: t }
        );

        const seatRows: Array<{ tripCoachId: string; seatNo: number; lockedUntil: Date | null }> = [];
        let coachASeatIds: string[] = [];

        for (let c = 0; c < tripCoaches.length; c++) {
          const tripCoach = tripCoaches[c];
          const isReserved = MASTER_COACHES[c].classType === 'Reserved';
          const seatCount = isReserved ? RESERVED_SEATS : UNRESERVED_SEATS;

          for (let seatNo = 1; seatNo <= seatCount; seatNo++) {
            seatRows.push({ tripCoachId: tripCoach.id, seatNo, lockedUntil: null });
            // Coach A is the first coach (index 0); capture its seat IDs in order.
            if (c === 0) {
              coachASeatIds.push(tripCoach.id); // placeholder, replaced below
            }
          }
        }

        // bulkCreate preserves row order, so we can map Coach A seat numbers to IDs.
        const createdSeats = await TripSeat.bulkCreate(seatRows, { transaction: t });
        coachASeatIds = createdSeats.slice(0, RESERVED_SEATS).map((seat) => seat.id);
        coachASeatIdsByTrip.push(coachASeatIds);
      }

      // --- Existing Bookings (demonstrating the core challenge) ---
      // Reference distances for the mock segments.
      const distColomboFort = 0;   // Stop 1
      const distKandy = 121;       // Stop 10
      const distBadulla = 300;     // Stop 27
      const distGampaha = 28;      // Stop 4
      const distHatton = 190;      // Stop 13

      const now = new Date();
      const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MS);

      // Per-seat fares for the three mock segments.
      const fareA = roundFare((distKandy - distColomboFort) * PRICE_PER_KM); // 121 * 5 = 605
      const fareB = roundFare((distBadulla - distKandy) * PRICE_PER_KM);     // 179 * 5 = 895
      const fareC = roundFare((distHatton - distGampaha) * PRICE_PER_KM);    // 162 * 5 = 810

      for (let i = 0; i < trips.length; i++) {
        const trip = trips[i];
        const coachASeats = coachASeatIdsByTrip[i];
        const seat1 = coachASeats[0]; // Seat 1
        const seat2 = coachASeats[1]; // Seat 2
        const seat5 = coachASeats[4]; // Seat 5

        // Booking 1 (CONFIRMED): Passenger A, Colombo Fort -> Kandy, Seats 1 & 2.
        const booking1 = await Booking.create(
          {
            passengerName: 'Passenger A',
            passengerEmail: 'passenger.a@example.com',
            totalFare: roundFare(fareA * 2), // 1,210.00
            status: 'CONFIRMED',
            expiresAt: null,
          },
          { transaction: t }
        );

        // Booking 2 (CONFIRMED - segment reuse): Passenger B, Kandy -> Badulla,
        // on the SAME Seats 1 & 2. Non-overlapping with Booking 1.
        const booking2 = await Booking.create(
          {
            passengerName: 'Passenger B',
            passengerEmail: 'passenger.b@example.com',
            totalFare: roundFare(fareB * 2), // 1,790.00
            status: 'CONFIRMED',
            expiresAt: null,
          },
          { transaction: t }
        );

        // Booking 3 (PENDING - yellow lock): Passenger C, Gampaha -> Hatton, Seat 5.
        const booking3 = await Booking.create(
          {
            passengerName: 'Passenger C',
            passengerEmail: 'passenger.c@example.com',
            totalFare: fareC, // 810.00
            status: 'PENDING',
            expiresAt: lockedUntil,
          },
          { transaction: t }
        );

        // Lock Seat 5 so it renders as Pending/Yellow for other users.
        await TripSeat.update(
          { lockedUntil },
          { where: { id: seat5 }, transaction: t }
        );

        // BookingSegments for all three bookings (bulk).
        await BookingSegment.bulkCreate(
          [
            // Booking 1: two segments (Seats 1 & 2), Colombo Fort -> Kandy.
            { bookingId: booking1.id, tripId: trip.id, tripSeatId: seat1, startStopId: stations[0].id, endStopId: stations[9].id, fare: fareA },
            { bookingId: booking1.id, tripId: trip.id, tripSeatId: seat2, startStopId: stations[0].id, endStopId: stations[9].id, fare: fareA },
            // Booking 2: two segments (Seats 1 & 2), Kandy -> Badulla.
            { bookingId: booking2.id, tripId: trip.id, tripSeatId: seat1, startStopId: stations[9].id, endStopId: stations[26].id, fare: fareB },
            { bookingId: booking2.id, tripId: trip.id, tripSeatId: seat2, startStopId: stations[9].id, endStopId: stations[26].id, fare: fareB },
            // Booking 3: one segment (Seat 5), Gampaha -> Hatton.
            { bookingId: booking3.id, tripId: trip.id, tripSeatId: seat5, startStopId: stations[3].id, endStopId: stations[12].id, fare: fareC },
          ],
          { transaction: t }
        );
      }

      // --- Summary ---
      const stationCount = await Station.count({ transaction: t });
      const routeStopCount = await RouteStop.count({ transaction: t });
      const trainCount = await Train.count({ transaction: t });
      const coachCount = await MasterCoach.count({ transaction: t });
      const scheduleCount = await Schedule.count({ transaction: t });
      const tripCount = await Trip.count({ transaction: t });
      const tripCoachCount = await TripCoach.count({ transaction: t });
      const tripSeatCount = await TripSeat.count({ transaction: t });
      const bookingCount = await Booking.count({ transaction: t });
      const segmentCount = await BookingSegment.count({ transaction: t });

      console.log('🌱 Seeding successful!');
      console.log(`   Stations: ${stationCount}`);
      console.log(`   RouteStops: ${routeStopCount}`);
      console.log(`   Trains: ${trainCount}`);
      console.log(`   MasterCoaches: ${coachCount}`);
      console.log(`   Schedules: ${scheduleCount}`);
      console.log(`   Trips: ${tripCount}`);
      console.log(`   TripCoaches: ${tripCoachCount}`);
      console.log(`   TripSeats: ${tripSeatCount}`);
      console.log(`   Bookings: ${bookingCount}`);
      console.log(`   BookingSegments: ${segmentCount}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
