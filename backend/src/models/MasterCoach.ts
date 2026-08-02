import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class MasterCoach extends Model {
  public id!: string;
  public train_id!: string;
  public coach_no!: string;
  public class_type!: 'Reserved' | 'Unreserved';
}

MasterCoach.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    train_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    coach_no: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    class_type: {
      type: DataTypes.ENUM('Reserved', 'Unreserved'),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'MasterCoach',
    paranoid: true,
    underscored: true,
    timestamps: true,
  }
);

export default MasterCoach;