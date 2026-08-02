import type { Request, Response } from 'express';

import { getAllStations } from '../services/stationService.js';

export const getAllStationsHandler = async (_req: Request, res: Response) => {
  try {
    const stations = await getAllStations();
    res.json({ stations });
  } catch (error) {
    console.error('❌ Failed to fetch stations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
