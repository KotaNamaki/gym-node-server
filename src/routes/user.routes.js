import express from 'express';
import {getUserById, getUserByEmail, deleteUserId, getAllUsers} from '../controllers/user.controller.js';
import {register} from '../controllers/auth.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.get('/', authMiddleware, adminReq, getAllUsers);
router.post('/register', register);
router.get('/:id', authMiddleware, getUserById);
router.get('/email/:email', authMiddleware, adminReq, getUserByEmail);
router.delete('/:id', authMiddleware, adminReq, deleteUserId);


export default router;