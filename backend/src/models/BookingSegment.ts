import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class BookingSegment extends Model {
  public id!: string;
  public booking_id!: string;
  public trip_id!: string;
  public trip_seat_id!: string;
  public start_stop_id!: string;
  public end_stop_id!: string;
}

BookingSegment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  booking_id: { type: DataTypes.UUID, allowNull: false },
  trip_id: { type: DataTypes.UUID, allowNull: false },
  trip_seat_id: { type: DataTypes.UUID, allowNull: false },
  start_stop_id: { type: DataTypes.UUID, allowNull: false }, // RouteStop ID
  end_stop_id: { type: DataTypes.UUID, allowNull: false },   // RouteStop ID
}, {
  sequelize,
  modelName: 'BookingSegment',
  underscored: true,
  timestamps: true,
});

export default BookingSegment;