import express from 'express';
import {login, register, getMe} from '../controllers/auth.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/admin/register', authMiddleware, adminReq, register);
router.post('/login', login);
router.get('/me', authMiddleware, getMe);

export default router;
