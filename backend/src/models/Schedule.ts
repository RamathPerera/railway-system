import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Schedule extends Model {
  public id!: string;
  public route_id!: string;
  public train_id!: string;
  public departure_time!: string;
}

Schedule.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  route_id: { type: DataTypes.UUID, allowNull: false },
  train_id: { type: DataTypes.UUID, allowNull: false },
  departure_time: { type: DataTypes.TIME, allowNull: false },
}, {
  sequelize,
  modelName: 'Schedule',
  paranoid: true,
  underscored: true,
});

export default Schedule;