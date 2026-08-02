import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Booking extends Model {
  public id!: string;
  public passenger_name!: string;
  public passenger_email!: string;
  public total_fare!: number;
  public status!: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  public expires_at!: Date | null;
}

Booking.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  passenger_name: { type: DataTypes.STRING, allowNull: false },
  passenger_email: { type: DataTypes.STRING, allowNull: false },
  total_fare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { 
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'), 
    defaultValue: 'PENDING' 
  },
  expires_at: { type: DataTypes.DATE, allowNull: true }, // For Temporary hold
}, {
  sequelize,
  modelName: 'Booking',
  underscored: true,
  timestamps: true,
});

export default Booking;