import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class MasterCoach extends Model {
  public declare id: string;
  public declare trainId: string;
  public declare coachNo: string;
  public declare classType: 'Reserved' | 'Unreserved';
}

MasterCoach.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    trainId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    coachNo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    classType: {
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
