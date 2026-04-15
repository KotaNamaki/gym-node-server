import {getDBPool} from '../config/db.js';
import bcrypt from 'bcryptjs';
import {generateToken} from '../utils/jwt.js';

export const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = generateToken({ id: user.id, email: user.email, role: user.role });
        
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


export const register = async (req, res) => {
    try {
        const {nama, email, password, role = 'customer', propinsi, kota} = req.body;
        if (!email || !password || !nama || !propinsi || !kota) {
            return res.status(400).json({ message: 'Nama, email, password, propinsi, dan kota harus diisi.' });
        }
        const validRole = ['customer', 'admin', 'trainer'];
        if (!validRole.includes(role)) {
            return res.status(400).json({ message: 'Role tidak valid. Hanya customer, admin, dan trainer yang diizinkan.' });
        }
        const db = await getDBPool();
        const existingUser = await db.query('SELECT id FROM user WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Email sudah terdaftar.' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const result = await db.query(
            'INSERT INTO user (nama, email, password, role, propinsi, kota) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, email, passwordHash, role, propinsi, kota]
        );
        const userId = typeof result.insertId === 'bigint' ? Number(result.insertId) : result.insertId;
        res.status(201).json({ message: 'User berhasil didaftarkan.', userId });
    } catch (error) {
        console.error('Failed to register user:', error);
        res.status(500).json({ message: 'Gagal mendaftarkan user.' });
    }
}
