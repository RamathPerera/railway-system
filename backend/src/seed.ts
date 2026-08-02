import { sequelize, Station, Route, RouteStop, Train, MasterCoach, Schedule, Trip, TripCoach, TripSeat } from './models/index.js';

const seed = async () => {
  try {
    await sequelize.sync({ force: true }); // To clear old data and create fresh tables

    // 1. Stations
    const fort = await Station.create({ name: 'Colombo Fort', code: 'FOT' });
    const kandy = await Station.create({ name: 'Kandy', code: 'KDT' });
    const badulla = await Station.create({ name: 'Badulla', code: 'BDL' });

    // 2. Route & Stops
    const mainLine = await Route.create({ name: 'Colombo-Badulla Main Line' });
    await RouteStop.create({ routeId: mainLine.id, stationId: fort.id, stopOrder: 1, distanceFromOrigin: 0 });
    await RouteStop.create({ routeId: mainLine.id, stationId: kandy.id, stopOrder: 5, distanceFromOrigin: 121 });
    await RouteStop.create({ routeId: mainLine.id, stationId: badulla.id, stopOrder: 20, distanceFromOrigin: 290 });

    // 3. Train & Master Coaches
    const menike = await Train.create({ name: 'Udarata Menike', number: '1015' });
    const coachA = await MasterCoach.create({ trainId: menike.id, coachNo: 'A', classType: 'Reserved' });

    // 4. Schedule & Trip for Today
    const schedule = await Schedule.create({ routeId: mainLine.id, trainId: menike.id, departureTime: '08:30:00' });
    const todayTrip = await Trip.create({ scheduleId: schedule.id, departureDate: new Date().toISOString().split('T')[0], status: 'Scheduled' });

    // 5. Create Trip Snapshot (Coaches & Seats)
    const tCoach = await TripCoach.create({ tripId: todayTrip.id, coachNo: 'A', classType: 'Reserved' });
    for (let i = 1; i <= 10; i++) {
      await TripSeat.create({ tripCoachId: tCoach.id, seatNo: i });
    }

    console.log('🌱 Seeding successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
