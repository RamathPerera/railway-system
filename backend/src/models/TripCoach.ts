import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class TripCoach extends Model {
  public id!: string;
  public trip_id!: string;
  public coach_no!: string;
  public class_type!: 'Reserved' | 'Unreserved';
}

TripCoach.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  trip_id: { type: DataTypes.UUID, allowNull: false },
  coach_no: { type: DataTypes.STRING, allowNull: false },
  class_type: { type: DataTypes.ENUM('Reserved', 'Unreserved'), allowNull: false },
}, {
  sequelize,
  modelName: 'TripCoach',
  underscored: true,
});

export default TripCoach;