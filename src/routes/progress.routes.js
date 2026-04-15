import express from 'express';
import {getAllProgress, getMyProgress, createProgress, deleteProgress} from '../controllers/progress.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.get('/', authMiddleware, adminReq, getAllProgress);
router.get('/my', authMiddleware, getMyProgress);
router.post('/', authMiddleware, createProgress);
router.delete('/:id', authMiddleware, adminReq, deleteProgress);

export default router;