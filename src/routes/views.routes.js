// src/routes/views.views.routes.js
import express from 'express';
import { authMiddleware } from '../middleware/Auth.Middleware.js';
import { adminReq, trainerReq, customerReq } from '../middleware/Role.Middleware.js';
import {
    CustomerBookingHistory,
    CustomerBookingHistoryId,
    matched_trainer_customer,
    member_progress_summary_id,
    member_progress_summary,
    session_participants,
    session_reviews_summary,
    trainer_schedule,
    upcoming_sessions_for_members
} from '../controllers/views.controller.js';

const router = express.Router();

// All view routes require authentication
router.use(authMiddleware);

// Customer Booking History Views
// Accessible by: customers (their own), trainers, admins
router.get('/customer-booking-history', (req, res, next) => {
    if (req.user.role === 'customer') {
        // Redirect customers to their own history
        return CustomerBookingHistoryId({ ...req, params: { id: req.user.id } }, res);
    }
    next();
}, adminReq, CustomerBookingHistory); // Admins can see all

router.get('/customer-booking-history/:id', (req, res, next) => {
    // Customers can only see their own history
    if (req.user.role === 'customer' && parseInt(req.params.id) !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only view your own booking history' });
    }
    next();
}, authMiddleware, CustomerBookingHistoryId);

// Matched Trainer-Customer View
// Accessible by: trainers and admins
router.get('/matched-trainer-customer', trainerReq, matched_trainer_customer);

// Member Progress Summary Views
router.get('/progress-summary', trainerReq, member_progress_summary); // Trainers & admins see all
router.get('/progress-summary/:id', (req, res, next) => {
    // Customers can see their own progress
    if (req.user.role === 'customer' && parseInt(req.params.id) !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only view your own progress' });
    }
    next();
}, authMiddleware, member_progress_summary_id);

// Session Participants View
router.get('/session-participants', trainerReq, session_participants);
router.get('/session-participants/:id', trainerReq, session_participants);

// Session Reviews Summary View
router.get('/session-reviews', (req, res, next) => {
    // Everyone can view reviews
    next();
}, session_reviews_summary);
router.get('/session-reviews/:id', session_reviews_summary);

// Trainer Schedule View
router.get('/trainer-schedule', trainerReq, trainer_schedule);
router.get('/trainer-schedule/:id', (req, res, next) => {
    // Trainers can only see their own schedule
    if (req.user.role === 'trainer' && parseInt(req.params.id) !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only view your own schedule' });
    }
    next();
}, authMiddleware, trainer_schedule);

// Upcoming Sessions for Members View
// Accessible by: customers, trainers, admins
router.get('/upcoming-sessions', (req, res, next) => {
    // All authenticated users can view upcoming sessions
    next();
}, upcoming_sessions_for_members);

export default router;