import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class TripSeat extends Model {
  public declare id: string;
  public declare tripCoachId: string;
  public declare seatNo: number;
}

TripSeat.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tripCoachId: { type: DataTypes.UUID, allowNull: false },
  seatNo: { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize,
  modelName: 'TripSeat',
  underscored: true,
  timestamps: true,
});

export default TripSeat;
