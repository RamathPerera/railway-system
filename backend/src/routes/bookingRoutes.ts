import { Router } from 'express';
import { createBookingHandler } from '../controllers/bookingController.js';

const router = Router();

// POST /api/bookings
router.post('/', createBookingHandler);

export default router;
