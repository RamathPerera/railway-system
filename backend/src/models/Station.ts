import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Station extends Model {
  public declare id: string;
  public declare name: string;
  public declare code: string;
}

Station.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Station',
    paranoid: true, // To enable soft deletes
    underscored: true,
    timestamps: true,
  }
);

export default Station;
