import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Schedule extends Model {
  public declare id: string;
  public declare routeId: string;
  public declare trainId: string;
  public declare departureTime: string;
}

Schedule.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  routeId: { type: DataTypes.UUID, allowNull: false },
  trainId: { type: DataTypes.UUID, allowNull: false },
  departureTime: { type: DataTypes.TIME, allowNull: false },
}, {
  sequelize,
  modelName: 'Schedule',
  paranoid: true,
  underscored: true,
  timestamps: true,
});

export default Schedule;
