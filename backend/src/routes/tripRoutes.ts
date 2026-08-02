import { Router } from 'express';
import { searchTripsHandler, getTripSeatsHandler } from '../controllers/tripController.js';

const router = Router();

// GET /api/trips?date=...&origin=...&dest=...
router.get('/', searchTripsHandler);

// GET /api/trips/:tripId/seats?start=...&end=...&page=...&limit=...
router.get('/:tripId/seats', getTripSeatsHandler);

export default router;

