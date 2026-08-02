import { Station } from '../models/index.js';

// Retrieves all active stations. Because the Station model is configured with
// `paranoid: true`, Sequelize automatically excludes soft-deleted records.
export const getAllStations = async () => {
  return Station.findAll();
};
