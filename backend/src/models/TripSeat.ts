import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class TripSeat extends Model {
  public id!: string;
  public trip_coach_id!: string;
  public seat_no!: number;
}

TripSeat.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  trip_coach_id: { type: DataTypes.UUID, allowNull: false },
  seat_no: { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize,
  modelName: 'TripSeat',
  underscored: true,
});

export default TripSeat;