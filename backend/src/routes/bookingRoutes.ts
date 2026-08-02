import { Router } from 'express';
import { createBookingHandler, getBookingHandler } from '../controllers/bookingController.js';

const router = Router();

// POST /api/bookings
router.post('/', createBookingHandler);

// GET /api/bookings/:id
router.get('/:id', getBookingHandler);

export default router;

