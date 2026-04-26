import express from 'express';
import { getAllTrainers, getTrainerById, getTrainerNameById, updateTrainer } from '../controllers/trainer.controller.js';
import { authMiddleware } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.get('/', getAllTrainers);
router.get('/:id', getTrainerById);
router.get('/:id/name', getTrainerNameById);
router.put('/:id', authMiddleware, updateTrainer);

export default router;
