import express from 'express';
import {getUserById, getUserByEmail, deleteUserId} from '../controllers/user.controller.js';
import {register} from '../controllers/auth.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.post('/register', register);
router.get('/:id', authMiddleware, getUserById);
router.get('/email/:email', authMiddleware, getUserByEmail, adminReq);
router.delete('/:id', authMiddleware, adminReq, deleteUserId);


export default router;