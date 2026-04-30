import { getDBPool } from '../config/db.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwt.js';
import cache from '../utils/cache.js';

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const db = await getDBPool();
        let user = null;
        let role = null;

        // 1. Cari di tabel user (customer)
        const customerRows = await db.query('SELECT * FROM user WHERE email = ?', [email]);
        if (customerRows.length > 0) {
            user = customerRows[0];
            role = 'customer';
        }

        // 2. Jika tidak ada, cari di tabel trainer
        if (!user) {
            const trainerRows = await db.query('SELECT * FROM trainer WHERE email = ?', [email]);
            if (trainerRows.length > 0) {
                user = trainerRows[0];
                role = 'trainer';
            }
        }

        // 3. Jika masih tidak ada, cari di tabel admin
        if (!user) {
            const adminRows = await db.query('SELECT * FROM admin WHERE email = ?', [email]);
            if (adminRows.length > 0) {
                user = adminRows[0];
                role = 'admin';
            }
        }

        // Jika email tidak ditemukan di tabel mana pun
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verifikasi password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Sertakan role dalam payload JWT agar Middleware dapat mengenali hak akses
        const token = generateToken({
            id: user.id,
            email: user.email,
            role: role
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                nama: user.nama,
                email: user.email,
                role: role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Helper untuk validasi input dasar
const validateBasicInfo = (nama, email, password) => {
    return nama && email && password;
};

// 1. User (Customer) Register
export const registerUser = async (req, res) => {
    try {
        const { nama, email, password, propinsi, kota } = req.body;
        if (!validateBasicInfo(nama, email, password)) {
            return res.status(400).json({ message: 'nama, email, and password are required' });
        }

        const db = await getDBPool();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO user (nama, email, password, propinsi, kota) VALUES (?, ?, ?, ?, ?)',
            [nama, email, passwordHash, propinsi || '', kota || '']
        );

        cache.del('user_stats');
        res.status(201).json({ id: result.insertId.toString(), nama, email, role: 'customer', message: 'Customer berhasil didaftarkan.' });
    } catch (error) {
        // PERUBAHAN: Menambahkan console.error untuk melihat pesan asli dari database
        console.error('Database Error during User Registration:', error);

        // Cek jika error karena email duplikat
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email sudah terdaftar. Silakan gunakan email lain.' });
        }

        res.status(500).json({ message: 'Gagal mendaftarkan customer.' });
    }
};

// 2. Trainer Register
export const registerTrainer = async (req, res) => {
    try {
        const { nama, email, password, spesialisasi, propinsi, kota } = req.body;
        if (!validateBasicInfo(nama, email, password)) {
            return res.status(400).json({ message: 'nama, email, and password are required' });
        }

        const db = await getDBPool();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO trainer (nama, email, password, spesialisasi, propinsi, kota) VALUES (?, ?, ?, ?, ?, ?)',
            [nama, email, passwordHash, spesialisasi || '', propinsi || '', kota || '']
        );

        cache.del('all_trainers');
        res.status(201).json({ id: result.insertId.toString(), nama, email, role: 'trainer', message: 'Trainer berhasil didaftarkan.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mendaftarkan trainer.' });
    }
};

// 3. Admin Register (Biasanya dilakukan oleh Admin lain)
export const registerAdmin = async (req, res) => {
    try {
        const { nama, email, password } = req.body;
        if (!validateBasicInfo(nama, email, password)) {
            return res.status(400).json({ message: 'nama, email, and password are required' });
        }

        const db = await getDBPool();
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO admin (nama, email, password) VALUES (?, ?, ?)',
            [nama, email, passwordHash]
        );

        res.status(201).json({ id: result.insertId.toString(), nama, email, role: 'admin', message: 'Admin berhasil didaftarkan.' });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mendaftarkan admin.' });
    }
};

export const getMe = async (req, res) => {
    console.log('[Controller] getMe called for user:', req.user?.id, 'role:', req.user?.role);
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const db = await getDBPool();

        let table;
        if (userRole === 'trainer') table = 'trainer';
        else if (userRole === 'admin') table = 'admin';
        else table = 'user';

        const rows = await db.query(
            `SELECT id, nama, email, propinsi, kota FROM ${table} WHERE id = ?`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ ...rows[0], role: userRole });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
