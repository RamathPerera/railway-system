import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Trip extends Model {
  public declare id: string;
  public declare scheduleId: string;
  public declare departureDate: string;
  public declare status: 'Scheduled' | 'In-Transit' | 'Completed' | 'Cancelled';
}

Trip.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  scheduleId: { type: DataTypes.UUID, allowNull: false },
  departureDate: { type: DataTypes.DATEONLY, allowNull: false },
  status: {
    type: DataTypes.ENUM('Scheduled', 'In-Transit', 'Completed', 'Cancelled'),
    defaultValue: 'Scheduled'
  },
}, {
  sequelize,
  modelName: 'Trip',
  paranoid: true,
  underscored: true,
  timestamps: true,
});

export default Trip;
