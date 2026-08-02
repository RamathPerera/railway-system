import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class BookingSegment extends Model {
  public declare id: string;
  public declare bookingId: string;
  public declare tripId: string;
  public declare tripSeatId: string;
  public declare startStopId: string;
  public declare endStopId: string;
  public declare fare: string;
}

BookingSegment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  bookingId: { type: DataTypes.UUID, allowNull: false },
  tripId: { type: DataTypes.UUID, allowNull: false },
  tripSeatId: { type: DataTypes.UUID, allowNull: false },
  startStopId: { type: DataTypes.UUID, allowNull: false }, // RouteStop ID
  endStopId: { type: DataTypes.UUID, allowNull: false },   // RouteStop ID
  fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // Per-segment fare (distance-based)
}, {
  sequelize,
  modelName: 'BookingSegment',
  underscored: true,
  timestamps: true,
});

export default BookingSegment;
