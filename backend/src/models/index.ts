import sequelize from '../config/database.js';
import Station from './Station.js';
import Route from './Route.js';
import RouteStop from './RouteStop.js';
import Train from './Train.js';
import MasterCoach from './MasterCoach.js';
import Schedule from './Schedule.js';
import Trip from './Trip.js';
import TripCoach from './TripCoach.js';
import TripSeat from './TripSeat.js';
import Booking from './Booking.js';
import BookingSegment from './BookingSegment.js';

// 1. Route <-> Station (via RouteStop)
Route.hasMany(RouteStop, { foreignKey: 'routeId', as: 'stops' });
RouteStop.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });

Station.hasMany(RouteStop, { foreignKey: 'stationId', as: 'stops' });
RouteStop.belongsTo(Station, { foreignKey: 'stationId', as: 'station' });

// 2. Train <-> MasterCoach
Train.hasMany(MasterCoach, { foreignKey: 'trainId', as: 'masterCoaches' });
MasterCoach.belongsTo(Train, { foreignKey: 'trainId', as: 'train' });

// 3. Schedule Relationships
Schedule.belongsTo(Route, { foreignKey: 'routeId', as: 'route' });
Schedule.belongsTo(Train, { foreignKey: 'trainId', as: 'train' });

// 4. Trip Relationships
Trip.belongsTo(Schedule, { foreignKey: 'scheduleId', as: 'schedule' });
Trip.hasMany(TripCoach, { foreignKey: 'tripId', as: 'coaches' });
TripCoach.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

// 5. TripCoach <-> TripSeat
TripCoach.hasMany(TripSeat, { foreignKey: 'tripCoachId', as: 'seats' });
TripSeat.belongsTo(TripCoach, { foreignKey: 'tripCoachId', as: 'tripCoach' });

// 6. Booking <-> BookingSegment
Booking.hasMany(BookingSegment, { foreignKey: 'bookingId', as: 'segments' });
BookingSegment.belongsTo(Booking, { foreignKey: 'bookingId', as: 'booking' });

// 7. BookingSegment Core Links
BookingSegment.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
BookingSegment.belongsTo(TripSeat, { foreignKey: 'tripSeatId', as: 'seat' });
BookingSegment.belongsTo(RouteStop, { foreignKey: 'startStopId', as: 'startStop' });
BookingSegment.belongsTo(RouteStop, { foreignKey: 'endStopId', as: 'endStop' });

export {
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
  BookingSegment
};
