import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Route extends Model {
  public id!: string;
  public name!: string;
}

Route.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Route',
    paranoid: true,
    underscored: true,
    timestamps: true,
  }
);

export default Route;