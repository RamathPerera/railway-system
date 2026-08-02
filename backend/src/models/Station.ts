import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Station extends Model {
  public id!: string;
  public name!: string;
  public code!: string;
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
    deleted_at: {
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