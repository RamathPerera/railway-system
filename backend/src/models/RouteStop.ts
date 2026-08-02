import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class RouteStop extends Model {
  public id!: string;
  public route_id!: string;
  public station_id!: string;
  public stop_order!: number;
  public distance_from_origin!: number;
}

RouteStop.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    route_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    station_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stop_order: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    distance_from_origin: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'RouteStop',
    underscored: true,
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['route_id', 'stop_order'], // Cannot have two stops with the same order in a route
      },
    ],
  }
);

export default RouteStop;