import express from 'express';
import {getAllBookings, getBookingById, createBooking, updateBookingStatus, getMyBookings} from '../controllers/booking.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.get('/', authMiddleware, adminReq, getAllBookings);
router.get('/my', authMiddleware, getMyBookings);
router.get('/:id', authMiddleware, getBookingById);
router.post('/', authMiddleware, createBooking);
router.patch('/:id/status', authMiddleware, adminReq, updateBookingStatus);

export default router;
