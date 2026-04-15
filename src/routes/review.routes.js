import express from 'express';
import {getAllReviews, getSessionReviews, createReview, deleteReview} from '../controllers/review.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.get('/', authMiddleware, adminReq, getAllReviews);
router.get('/session/:session_id', getSessionReviews);
router.post('/', authMiddleware, createReview);
router.delete('/:id', authMiddleware, adminReq, deleteReview);

export default router;