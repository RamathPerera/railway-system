import { Router } from 'express';
import {
  createBookingHandler,
  getBookingHandler,
  confirmBookingHandler,
  cancelBookingHandler,
} from '../controllers/bookingController.js';

const router = Router();

// POST /api/bookings
router.post('/', createBookingHandler);

// GET /api/bookings/:id
router.get('/:id', getBookingHandler);

// PATCH /api/bookings/:id/pay
router.patch('/:id/pay', confirmBookingHandler);

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', cancelBookingHandler);

export default router;


