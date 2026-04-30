import express from 'express';
import {getUserById, getUserByEmail, deleteUserId, getAllUsers, updateUser} from '../controllers/user.controller.js';
import {registerAdmin, registerTrainer, registerUser} from '../controllers/auth.controller.js';
import {authMiddleware} from '../middleware/Auth.Middleware.js';
import {adminReq} from '../middleware/Role.Middleware.js';

const router = express.Router();

router.get('/', authMiddleware, adminReq, getAllUsers);
// Public registration
router.post('/register/user', registerUser);
router.post('/register/trainer', registerTrainer);

// Protected registration (hanya admin yang bisa buat admin baru)
router.post('/register/admin', authMiddleware, adminReq, registerAdmin);

router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.get('/email/:email', authMiddleware, adminReq, getUserByEmail);
router.delete('/:id', authMiddleware, adminReq, deleteUserId);


export default router;
