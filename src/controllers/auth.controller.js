import {getDBPool} from '../config/db.js';
import bcrypt from 'bcrypt';
import {generateToken} from '../utils/jwt.js';
import cache from '../utils/cache.js';

export const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM user WHERE email = ?', [email]);

        if (rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        const token = generateToken({ id: user.id, email: user.email, role: user.role });
        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, nama: user.nama, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const register = async (req, res) => {
    try {
        const {nama, email, password, role = 'customer', propinsi, kota} = req.body;

        if (!nama || !email || !password) {
            return res.status(400).json({ message: 'nama, email, and password are required' });
        }

        // FIX: Only allow valid roles on registration; prevent self-assigning 'admin'
        const allowedRoles = ['customer', 'trainer'];
        const assignedRole = allowedRoles.includes(role) ? role : 'customer';

        const db = await getDBPool();

        // FIX: Check for existing email before attempting insert for a cleaner error message
        const existing = await db.query('SELECT id FROM user WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO user (nama, email, password, role, propinsi, kota) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, email, passwordHash, assignedRole, propinsi || '', kota || '']
        );
        const userId = Number(result.insertId);

        cache.del('user_stats');
        if (assignedRole === 'trainer') cache.del('all_trainers');

        res.status(201).json({ id: userId, nama, email, role: assignedRole, message: 'User berhasil didaftarkan.' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Gagal mendaftarkan user.' });
    }
};

export const getMe = async (req, res) => {
    console.log('[Controller] getMe called for user:', req.user?.id);
    try {
        const userId = req.user.id;
        const db = await getDBPool();
        const rows = await db.query(
            'SELECT id, nama, email, role, propinsi, kota FROM user WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
