import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Trip extends Model {
  public id!: string;
  public schedule_id!: string;
  public departure_date!: string;
  public status!: 'Scheduled' | 'In-Transit' | 'Completed' | 'Cancelled';
}

Trip.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  schedule_id: { type: DataTypes.UUID, allowNull: false },
  departure_date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { 
    type: DataTypes.ENUM('Scheduled', 'In-Transit', 'Completed', 'Cancelled'), 
    defaultValue: 'Scheduled' 
  },
}, {
  sequelize,
  modelName: 'Trip',
  paranoid: true,
  underscored: true,
});

export default Trip;