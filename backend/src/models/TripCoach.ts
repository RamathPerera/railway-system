import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class TripCoach extends Model {
  public declare id: string;
  public declare tripId: string;
  public declare coachNo: string;
  public declare classType: 'Reserved' | 'Unreserved';
}

TripCoach.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tripId: { type: DataTypes.UUID, allowNull: false },
  coachNo: { type: DataTypes.STRING, allowNull: false },
  classType: { type: DataTypes.ENUM('Reserved', 'Unreserved'), allowNull: false },
}, {
  sequelize,
  modelName: 'TripCoach',
  underscored: true,
  timestamps: true,
});

export default TripCoach;
