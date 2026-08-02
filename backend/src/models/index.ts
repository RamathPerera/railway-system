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
Route.hasMany(RouteStop, { foreignKey: 'route_id', as: 'stops' });
RouteStop.belongsTo(Route, { foreignKey: 'route_id' });

Station.hasMany(RouteStop, { foreignKey: 'station_id' });
RouteStop.belongsTo(Station, { foreignKey: 'station_id', as: 'station' });

// 2. Train <-> MasterCoach
Train.hasMany(MasterCoach, { foreignKey: 'train_id', as: 'master_coaches' });
MasterCoach.belongsTo(Train, { foreignKey: 'train_id' });

// 3. Schedule Relationships
Schedule.belongsTo(Route, { foreignKey: 'route_id', as: 'route' });
Schedule.belongsTo(Train, { foreignKey: 'train_id', as: 'train' });

// 4. Trip Relationships
Trip.belongsTo(Schedule, { foreignKey: 'schedule_id', as: 'schedule' });
Trip.hasMany(TripCoach, { foreignKey: 'trip_id', as: 'coaches' });
TripCoach.belongsTo(Trip, { foreignKey: 'trip_id' });

// 5. TripCoach <-> TripSeat
TripCoach.hasMany(TripSeat, { foreignKey: 'trip_coach_id', as: 'seats' });
TripSeat.belongsTo(TripCoach, { foreignKey: 'trip_coach_id' });

// 6. Booking <-> BookingSegment
Booking.hasMany(BookingSegment, { foreignKey: 'booking_id', as: 'segments' });
BookingSegment.belongsTo(Booking, { foreignKey: 'booking_id' });

// 7. BookingSegment Core Links
BookingSegment.belongsTo(Trip, { foreignKey: 'trip_id' });
BookingSegment.belongsTo(TripSeat, { foreignKey: 'trip_seat_id', as: 'seat' });
BookingSegment.belongsTo(RouteStop, { foreignKey: 'start_stop_id', as: 'start_stop' });
BookingSegment.belongsTo(RouteStop, { foreignKey: 'end_stop_id', as: 'end_stop' });

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