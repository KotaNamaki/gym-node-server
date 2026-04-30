import express from 'express';
import {getAllSessions, getSessionById, createSession, updateSession, deleteSession, getUpcomingSessions} from '../controllers/session.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {trainerReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.get('/', getAllSessions);
router.get('/upcoming', getUpcomingSessions);
router.get('/:id', getSessionById);
router.post('/', authMiddleware, trainerReq, createSession);
router.put('/:id', authMiddleware, trainerReq, updateSession);
router.delete('/:id', authMiddleware, trainerReq, deleteSession);

export default router;
