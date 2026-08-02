import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class RouteStop extends Model {
  public declare id: string;
  public declare routeId: string;
  public declare stationId: string;
  public declare stopOrder: number;
  public declare distanceFromOrigin: number;
}

RouteStop.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    routeId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    stopOrder: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    distanceFromOrigin: {
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
