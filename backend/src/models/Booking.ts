import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Booking extends Model {
  public declare id: string;
  public declare passengerName: string;
  public declare passengerEmail: string;
  public declare mobileNumber: string;
  public declare nic: string;
  public declare totalFare: number;
  public declare status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  public declare expiresAt: Date | null;
  public declare createdAt: Date;
}


Booking.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  passengerName: { type: DataTypes.STRING, allowNull: false },
  passengerEmail: { type: DataTypes.STRING, allowNull: false },
  mobileNumber: { type: DataTypes.STRING, allowNull: false },
  nic: { type: DataTypes.STRING, allowNull: false },
  totalFare: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

  status: {
    type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'CANCELLED'),
    defaultValue: 'PENDING'
  },
  expiresAt: { type: DataTypes.DATE, allowNull: true }, // For Temporary hold
}, {
  sequelize,
  modelName: 'Booking',
  paranoid: true, // Soft delete (deleted_at) for audit trail
  underscored: true,
  timestamps: true,
});


export default Booking;
