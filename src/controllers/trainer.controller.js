import {getDBPool} from '../config/db.js';
import cache from '../utils/cache.js';

export const getAllTrainers = async (req, res) => {
    try {
        const db = await getDBPool();
        const { nama, email, _page, _limit } = req.query;

        const page = parseInt(_page) || 1;
        const limit = parseInt(_limit) || 20;
        const offset = (page - 1) * limit;

        let query = "SELECT id, nama, email, role, propinsi, kota FROM user WHERE role = 'trainer'";
        let countQuery = "SELECT COUNT(*) as total FROM user WHERE role = 'trainer'";
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

export const getTrainerById = async (req, res) => {
    console.log('[Controller] getTrainerById called', req.params.id);
    try {
        const { id } = req.params;
        const cacheKey = `trainer_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return res.json(cachedData);
        }

        const db = await getDBPool();
        const rows = await db.query(
            "SELECT id, nama, email, role, propinsi, kota FROM user WHERE id = ? AND role = 'trainer'",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }

        cache.set(cacheKey, rows[0]);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        res.json(rows[0]);
    } catch (error) {
        console.error(`Failed to get trainer_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching trainer.' });
    }
};

export const getTrainerNameById = async (req, res) => {
    console.log('[Controller] getTrainerNameById called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();
        const rows = await db.query(
            "SELECT nama FROM user WHERE id = ? AND role = 'trainer'",
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }
        res.json({ id, nama: rows[0].nama });
    } catch (error) {
        console.error(`Failed to get trainer name for id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching trainer name.' });
    }
};

export const getTrainerSchedule = async (req, res) => {
    console.log('[Controller] getTrainerSchedule called', req.params.id);
    try {
        const { id } = req.params || {};
        const trainerId = id || req.user.id;

        // Non-admin trainers can only view their own schedule
        if (req.user.role === 'trainer' && req.user.id !== parseInt(trainerId)) {
            return res.status(403).json({ message: 'Forbidden: You can only view your own schedule' });
        }

        const cacheKey = `view_trainer_schedule_${trainerId}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return res.json(cachedData);
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT trainer_id, trainer_name, session_id, title, start_time, end_time, confirmed_customers FROM trainer_schedule WHERE trainer_id = ?',
            [trainerId]
        );

        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        res.json(rows);
    } catch (error) {
        console.error(`Failed to get schedule for trainer:`, error);
        res.status(500).json({ message: 'Error fetching trainer schedule.' });
    }
};

export const updateTrainer = async (req, res) => {
    console.log('[Controller] updateTrainer called', req.params.id);
    try {
        const { id } = req.params;
        const { nama, email, propinsi, kota } = req.body;
        const loggedInUser = req.user;

        if (loggedInUser.role !== 'admin' && loggedInUser.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
        }

        const db = await getDBPool();

        const rows = await db.query("SELECT * FROM user WHERE id = ? AND role = 'trainer'", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }
        const existing = rows[0];

        const updateData = {
            nama: nama || existing.nama,
            email: email || existing.email,
            propinsi: propinsi || existing.propinsi,
            kota: kota || existing.kota
        };

        await db.query(
            "UPDATE user SET nama = ?, email = ?, propinsi = ?, kota = ? WHERE id = ? AND role = 'trainer'",
            [updateData.nama, updateData.email, updateData.propinsi, updateData.kota, id]
        );

        cache.del('all_trainers');
        cache.del(`trainer_${id}`);
        console.log('[Cache] Invalidated for updated trainer', id);

        res.json({ message: 'Trainer updated successfully', trainer: { id, ...updateData } });
    } catch (error) {
        console.error(`Failed to update trainer_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error updating trainer.' });
    }
};
