import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class TripSeat extends Model {
  public declare id: string;
  public declare tripCoachId: string;
  public declare seatNo: number;
  public declare lockedUntil: Date | null;
}

TripSeat.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tripCoachId: { type: DataTypes.UUID, allowNull: false },
  seatNo: { type: DataTypes.INTEGER, allowNull: false },
  lockedUntil: { type: DataTypes.DATE, allowNull: true }, // Temporary seat lock expiry (Pending/Yellow state)
}, {
  sequelize,
  modelName: 'TripSeat',
  underscored: true,
  timestamps: true,
});

export default TripSeat;
