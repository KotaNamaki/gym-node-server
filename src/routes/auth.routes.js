import express from 'express';
import { login,getMe } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/Auth.Middleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router;
