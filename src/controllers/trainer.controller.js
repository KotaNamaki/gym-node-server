import {getDBPool} from '../config/db.js';
import cache from '../utils/cache.js';

export const getAllTrainers = async (req, res) => {
    try {
        const db = await getDBPool();
        const { nama, email, _page, _limit } = req.query;

        const page = parseInt(_page) || 1;
        const limit = parseInt(_limit) || 20;
        const offset = (page - 1) * limit;

        // FIX: Query langsung ke tabel 'trainer' tanpa filter role
        let query = "SELECT id, nama, email, spesialisasi, propinsi, kota FROM trainer WHERE 1=1";
        let countQuery = "SELECT COUNT(*) as total FROM trainer WHERE 1=1";
        let params = [];

        if (nama) {
            query += ' AND nama LIKE ?';
            countQuery += ' AND nama LIKE ?';
            params.push(`%${nama}%`);
        }

        const rows = await db.query(query + ' LIMIT ? OFFSET ?', [...params, limit, offset]);
        const countResult = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        res.setHeader('X-Total-Count', total);
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trainers.' });
    }
};

export const getTrainerName = async (req, res) => {
    try {
        const { nama } = req.params;
        const cacheKey = `trainer_${nama}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const db = await getDBPool();
        // FIX: Query ke tabel 'trainer'
        const rows = await db.query(
            "SELECT id, nama, email, spesialisasi, propinsi, kota FROM trainer WHERE nama = ?",
            [nama]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }

        cache.set(cacheKey, rows[0]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trainer.' });
    }
};
export const getTrainerById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `trainer_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return res.json(cachedData);

        const db = await getDBPool();
        // FIX: Query ke tabel 'trainer'
        const rows = await db.query(
            "SELECT id, nama, email, spesialisasi, propinsi, kota FROM trainer WHERE id = ?",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }

        cache.set(cacheKey, rows[0]);
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trainer.' });
    }
};
export const getTrainerSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const trainerId = id || req.user.id;

        // Validasi akses tetap diperlukan[cite: 15]
        if (req.user.role === 'trainer' && req.user.id !== parseInt(trainerId)) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const db = await getDBPool();
        // Menggunakan view yang sudah disiapkan di database[cite: 2, 15]
        const rows = await db.query(
            'SELECT * FROM trainer_schedule WHERE trainer_id = ?',
            [trainerId]
        );

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule.' });
    }
};

export const updateTrainer = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, email, spesialisasi, propinsi, kota } = req.body;
        const loggedInUser = req.user;

        // Pastikan hanya admin atau pelatih ybs yang bisa update[cite: 15]
        if (loggedInUser.role !== 'admin' && (loggedInUser.role !== 'trainer' || loggedInUser.id !== parseInt(id))) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const db = await getDBPool();
        const [existing] = await db.query("SELECT * FROM trainer WHERE id = ?", [id]);
        if (!existing) return res.status(404).json({ message: 'Trainer not found' });

        // FIX: Update ke tabel 'trainer'[cite: 2, 15]
        await db.query(
            "UPDATE trainer SET nama = ?, email = ?, spesialisasi = ?, propinsi = ?, kota = ? WHERE id = ?",
            [nama || existing.nama, email || existing.email, spesialisasi || existing.spesialisasi, propinsi || existing.propinsi, kota || existing.kota, id]
        );

        cache.del('all_trainers');
        cache.del(`trainer_${id}`);
        res.json({ message: 'Trainer updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating trainer.' });
    }
};
