import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database.js';

class Train extends Model {
  public id!: string;
  public name!: string;
  public number!: string;
}

Train.init(
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
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: 'Train',
    paranoid: true,
    underscored: true,
    timestamps: true,
  }
);

export default Train;