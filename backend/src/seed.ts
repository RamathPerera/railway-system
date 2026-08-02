import { sequelize, Station, Route, RouteStop, Train, MasterCoach, Schedule, Trip, TripCoach, TripSeat } from './models/index.js';

// Helper to build an ISO date string (YYYY-MM-DD) offset by N days from today.
const dateOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

// Materialize the trip-level snapshot for a given trip by cloning the train's
// MasterCoach template into TripCoach rows and generating the TripSeat rows.
const materializeTripSnapshot = async (
  tripId: string,
  masterCoaches: MasterCoach[],
  transaction: any
): Promise<void> => {
  for (const mc of masterCoaches) {
    const tripCoach = await TripCoach.create(
      {
        tripId,
        coachNo: mc.coachNo,
        classType: mc.classType,
      },
      { transaction }
    );

    // Reserved coaches have assigned seats; unreserved coaches have more standing/bench seats.
    const seatCount = mc.classType === 'Reserved' ? 40 : 60;
    const seats = Array.from({ length: seatCount }, (_, i) => ({
      tripCoachId: tripCoach.id,
      seatNo: i + 1,
      lockedUntil: null,
    }));

    await TripSeat.bulkCreate(seats, { transaction });
  }
};

const seed = async () => {
  try {
    // 0. Clean wipe: drop all tables and recreate them from the current schema.
    await sequelize.sync({ force: true });

    // 1. Wrap all data seeding in a single transaction so a failure rolls back
    //    the entire seed and never leaves a partial data state.
    await sequelize.transaction(async (t) => {
      // --- Stations (ordered along the Colombo-Badulla Main Line) ---
      const fort = await Station.create({ name: 'Colombo Fort', code: 'FOT' }, { transaction: t });
      const peradeniya = await Station.create({ name: 'Peradeniya', code: 'PDN' }, { transaction: t });
      const kandy = await Station.create({ name: 'Kandy', code: 'KDT' }, { transaction: t });
      const hatton = await Station.create({ name: 'Hatton', code: 'HAT' }, { transaction: t });
      const nanuOya = await Station.create({ name: 'Nanu Oya', code: 'NNO' }, { transaction: t });
      const ella = await Station.create({ name: 'Ella', code: 'ELL' }, { transaction: t });
      const badulla = await Station.create({ name: 'Badulla', code: 'BDL' }, { transaction: t });

      // --- Route & RouteStops (ascending stop_order with correct cumulative distances) ---
      const mainLine = await Route.create({ name: 'Colombo-Badulla Main Line' }, { transaction: t });

      const stops = [
        { stationId: fort.id, stopOrder: 1, distanceFromOrigin: 0 },
        { stationId: peradeniya.id, stopOrder: 2, distanceFromOrigin: 115 },
        { stationId: kandy.id, stopOrder: 3, distanceFromOrigin: 121 },
        { stationId: hatton.id, stopOrder: 4, distanceFromOrigin: 210 },
        { stationId: nanuOya.id, stopOrder: 5, distanceFromOrigin: 230 },
        { stationId: ella.id, stopOrder: 6, distanceFromOrigin: 270 },
        { stationId: badulla.id, stopOrder: 7, distanceFromOrigin: 290 },
      ];

      await RouteStop.bulkCreate(
        stops.map((s) => ({ routeId: mainLine.id, ...s })),
        { transaction: t }
      );

      // --- Trains & Master Coaches (Reserved + Unreserved mix) ---
      const menike = await Train.create({ name: 'Udarata Menike', number: '1015' }, { transaction: t });
      const podiMenike = await Train.create({ name: 'Podi Menike', number: '1016' }, { transaction: t });

      const menikeCoaches = await MasterCoach.bulkCreate(
        [
          { trainId: menike.id, coachNo: 'A', classType: 'Reserved' },
          { trainId: menike.id, coachNo: 'B', classType: 'Reserved' },
          { trainId: menike.id, coachNo: 'C', classType: 'Reserved' },
          { trainId: menike.id, coachNo: 'D', classType: 'Unreserved' },
          { trainId: menike.id, coachNo: 'E', classType: 'Unreserved' },
        ],
        { transaction: t }
      );

      const podiMenikeCoaches = await MasterCoach.bulkCreate(
        [
          { trainId: podiMenike.id, coachNo: 'A', classType: 'Reserved' },
          { trainId: podiMenike.id, coachNo: 'B', classType: 'Reserved' },
          { trainId: podiMenike.id, coachNo: 'C', classType: 'Unreserved' },
        ],
        { transaction: t }
      );

      // --- Schedules (train -> route with daily departure time) ---
      const menikeSchedule = await Schedule.create(
        { routeId: mainLine.id, trainId: menike.id, departureTime: '08:30:00' },
        { transaction: t }
      );
      const podiSchedule = await Schedule.create(
        { routeId: mainLine.id, trainId: podiMenike.id, departureTime: '15:30:00' },
        { transaction: t }
      );

      // --- Trips (today and tomorrow, Scheduled status) ---
      const menikeToday = await Trip.create(
        { scheduleId: menikeSchedule.id, departureDate: dateOffset(0), status: 'Scheduled' },
        { transaction: t }
      );
      const menikeTomorrow = await Trip.create(
        { scheduleId: menikeSchedule.id, departureDate: dateOffset(1), status: 'Scheduled' },
        { transaction: t }
      );
      const podiToday = await Trip.create(
        { scheduleId: podiSchedule.id, departureDate: dateOffset(0), status: 'Scheduled' },
        { transaction: t }
      );

      // --- Trip-level snapshots (TripCoaches + TripSeats) ---
      await materializeTripSnapshot(menikeToday.id, menikeCoaches, t);
      await materializeTripSnapshot(menikeTomorrow.id, menikeCoaches, t);
      await materializeTripSnapshot(podiToday.id, podiMenikeCoaches, t);

      // --- Summary ---
      const stationCount = await Station.count({ transaction: t });
      const routeStopCount = await RouteStop.count({ transaction: t });
      const trainCount = await Train.count({ transaction: t });
      const coachCount = await MasterCoach.count({ transaction: t });
      const scheduleCount = await Schedule.count({ transaction: t });
      const tripCount = await Trip.count({ transaction: t });
      const tripCoachCount = await TripCoach.count({ transaction: t });
      const tripSeatCount = await TripSeat.count({ transaction: t });

      console.log('🌱 Seeding successful!');
      console.log(`   Stations: ${stationCount}`);
      console.log(`   RouteStops: ${routeStopCount}`);
      console.log(`   Trains: ${trainCount}`);
      console.log(`   MasterCoaches: ${coachCount}`);
      console.log(`   Schedules: ${scheduleCount}`);
      console.log(`   Trips: ${tripCount}`);
      console.log(`   TripCoaches: ${tripCoachCount}`);
      console.log(`   TripSeats: ${tripSeatCount}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
