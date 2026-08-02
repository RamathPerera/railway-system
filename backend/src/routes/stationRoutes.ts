import { Router } from 'express';
import { getAllStationsHandler } from '../controllers/stationController.js';

const router = Router();

// GET /api/stations
router.get('/', getAllStationsHandler);

export default router;
