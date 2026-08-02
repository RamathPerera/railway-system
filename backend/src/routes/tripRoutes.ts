import { Router } from 'express';
import { searchTripsHandler } from '../controllers/tripController.js';

const router = Router();

// GET /api/trips?date=...&origin=...&dest=...
router.get('/', searchTripsHandler);

export default router;
