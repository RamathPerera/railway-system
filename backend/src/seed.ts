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
// Uses LOCAL date components (not toISOString, which is UTC) so the seeded
// departure dates align with the local dates the frontend submits. Between
// 00:00-05:29 local (UTC+5:30) toISOString would return the previous day.
const dateOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

      // Route 1: Colombo-Badulla Main Line (outbound).
      const mainLine = await Route.create({ name: 'Colombo-Badulla Main Line' }, { transaction: t });

      // Route 2: Badulla-Colombo Main Line (return). Reverse the station order so
      // Badulla is stop 1 @ 0km and Colombo Fort is stop 27 @ 300km.
      const returnLine = await Route.create({ name: 'Badulla-Colombo Main Line' }, { transaction: t });
      const REVERSE_STATIONS = [...STATIONS].reverse().map((s, index) => ({
        ...s,
        stopOrder: index + 1,
        distanceFromOrigin: 300 - s.distanceFromOrigin,
      }));

      // Map each station CODE back to its real created UUID. We MUST resolve the
      // stationId by code (not by array index) because REVERSE_STATIONS is the
      // reversed array: its index 0 is Badulla, whereas stations[0] is Colombo
      // Fort. Using index parity here would attach Badulla's stopOrder/distance
      // to Colombo Fort's UUID (and vice-versa), silently corrupting Route 2's
      // station->stop mapping and breaking return-trip searches.
      const stationByCode = new Map(stations.map((st) => [st.code, st]));

      // Capture the created RouteStops so we can reference their real UUIDs
      // (route_stops.id) as the startStopId/endStopId foreign keys on segments.
      // 27 stops for Route 1 + 27 stops for Route 2 = 54 RouteStops total.
      const routeStops = await RouteStop.bulkCreate(
        [
          ...STATIONS.map((s, index) => ({
            routeId: mainLine.id,
            stationId: stations[index].id,
            stopOrder: s.stopOrder,
            distanceFromOrigin: s.distanceFromOrigin,
          })),
          ...REVERSE_STATIONS.map((s) => {
            const st = stationByCode.get(s.code);
            if (!st) {
              throw new Error(`Missing created station for code "${s.code}" - cannot build Route 2 stops`);
            }
            return {
              routeId: returnLine.id,
              stationId: st.id,
              stopOrder: s.stopOrder,
              distanceFromOrigin: s.distanceFromOrigin,
            };
          }),
        ],
        { transaction: t }
      );


      // Map each stationId -> its RouteStop.id for the mock booking segments.
      // Route 1 stops are the first 27 created; Route 2 stops are the last 27.
      const routeStopByStation = new Map<string, string>();
      const returnStopByStation = new Map<string, string>();
      for (let i = 0; i < routeStops.length; i++) {
        const rs = routeStops[i];
        if (i < STATIONS.length) {
          routeStopByStation.set(rs.stationId, rs.id);
        } else {
          returnStopByStation.set(rs.stationId, rs.id);
        }
      }



      // --- Train & Master Coaches (Udarata Menike, 8 coaches) ---
      const menike = await Train.create({ name: 'Udarata Menike', number: '1015' }, { transaction: t });

      const masterCoaches = await MasterCoach.bulkCreate(
        MASTER_COACHES.map((mc) => ({ trainId: menike.id, ...mc })),
        { transaction: t }
      );

      // --- Schedules (bidirectional, same train) ---
      // Schedule 1: outbound Colombo-Badulla, daily 08:30 departure.
      const schedule = await Schedule.create(
        { routeId: mainLine.id, trainId: menike.id, departureTime: '08:30:00' },
        { transaction: t }
      );
      // Schedule 2: return Badulla-Colombo, daily 16:30 departure.
      const returnSchedule = await Schedule.create(
        { routeId: returnLine.id, trainId: menike.id, departureTime: '16:30:00' },
        { transaction: t }
      );

      // --- Trips (7 consecutive days starting today, 2 per day) ---
      // trips[i*2]   = outbound (Schedule 1)
      // trips[i*2+1] = return   (Schedule 2)
      const trips = await Trip.bulkCreate(
        Array.from({ length: 14 }, (_, i) => ({
          scheduleId: i % 2 === 0 ? schedule.id : returnSchedule.id,
          departureDate: dateOffset(Math.floor(i / 2)),
          status: 'Scheduled',
        })),
        { transaction: t }
      );

      // --- Trip snapshots: TripCoaches + TripSeats (bulk, ~5,880 seats total) ---
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

      // Resolve the actual RouteStop UUIDs for the mock segments. These are the
      // FK targets of booking_segments.start_stop_id / end_stop_id (NOT Station ids).
      const colomboFortStopId = routeStopByStation.get(stations[0].id);
      const kandyStopId = routeStopByStation.get(stations[9].id);
      const badullaStopId = routeStopByStation.get(stations[26].id);
      const gampahaStopId = routeStopByStation.get(stations[3].id);
      const hattonStopId = routeStopByStation.get(stations[12].id);

      // Fail fast with a readable message if any required RouteStop is missing.
      const requiredStops = [
        ['Colombo Fort', colomboFortStopId],
        ['Kandy', kandyStopId],
        ['Badulla', badullaStopId],
        ['Gampaha', gampahaStopId],
        ['Hatton', hattonStopId],
      ] as const;
      for (const [name, id] of requiredStops) {
        if (!id) {
          throw new Error(`Missing RouteStop for station "${name}" - cannot create booking segments`);
        }
      }

      // Return-trip (Route 2) distances: Badulla is 0km, Kandy is 179km.
      const distReturnBadulla = 0;   // Stop 1 on Route 2
      const distReturnKandy = 179;   // Stop 10 on Route 2 (300 - 121)
      const fareReturn = roundFare((distReturnKandy - distReturnBadulla) * PRICE_PER_KM); // 179 * 5 = 895

      // Resolve Route 2 RouteStop UUIDs for the return mock booking.
      const returnBadullaStopId = returnStopByStation.get(stations[26].id);
      const returnKandyStopId = returnStopByStation.get(stations[9].id);
      if (!returnBadullaStopId || !returnKandyStopId) {
        throw new Error('Missing RouteStop for return route - cannot create return booking segments');
      }

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
            mobileNumber: '+94771234567',
            nic: '200012345678',
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
            mobileNumber: '+94771234567',
            nic: '200012345678',
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
            mobileNumber: '+94771234567',
            nic: '200012345678',
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

        // BookingSegments for all three bookings (bulk). startStopId/endStopId
        // must reference route_stops.id (resolved above), NOT station ids.
        await BookingSegment.bulkCreate(
          [
            // Booking 1: two segments (Seats 1 & 2), Colombo Fort -> Kandy.
            { bookingId: booking1.id, tripId: trip.id, tripSeatId: seat1, startStopId: colomboFortStopId, endStopId: kandyStopId, fare: fareA },
            { bookingId: booking1.id, tripId: trip.id, tripSeatId: seat2, startStopId: colomboFortStopId, endStopId: kandyStopId, fare: fareA },
            // Booking 2: two segments (Seats 1 & 2), Kandy -> Badulla.
            { bookingId: booking2.id, tripId: trip.id, tripSeatId: seat1, startStopId: kandyStopId, endStopId: badullaStopId, fare: fareB },
            { bookingId: booking2.id, tripId: trip.id, tripSeatId: seat2, startStopId: kandyStopId, endStopId: badullaStopId, fare: fareB },
            // Booking 3: one segment (Seat 5), Gampaha -> Hatton.
            { bookingId: booking3.id, tripId: trip.id, tripSeatId: seat5, startStopId: gampahaStopId, endStopId: hattonStopId, fare: fareC },
          ],
          { transaction: t }
        );

        // Return-trip proof: add one CONFIRMED booking on the first Route 2
        // return trip (index 1), Badulla -> Kandy, Seat 3.
        if (i === 1) {
          const seat3 = coachASeats[2]; // Seat 3
          const returnBooking = await Booking.create(
            {
              passengerName: 'Passenger D',
              passengerEmail: 'passenger.d@example.com',
              mobileNumber: '+94771234567',
              nic: '200012345678',
              totalFare: fareReturn, // 895.00
              status: 'CONFIRMED',
              expiresAt: null,
            },
            { transaction: t }
          );

          await BookingSegment.bulkCreate(
            [
              // Return booking: one segment (Seat 3), Badulla -> Kandy.
              { bookingId: returnBooking.id, tripId: trip.id, tripSeatId: seat3, startStopId: returnBadullaStopId, endStopId: returnKandyStopId, fare: fareReturn },
            ],
            { transaction: t }
          );
        }

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
