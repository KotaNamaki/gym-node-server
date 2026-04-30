import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';
import cache from '../utils/cache.js';


/**
 * FIX: Sekarang mencari di tabel 'trainer', bukan lagi tabel 'user'
 * karena data pelatih sudah dipisahkan.
 */
const isValidTrainer = async (db, trainer_id) => {
    const rows = await db.query("SELECT id FROM trainer WHERE id = ?", [trainer_id]);
    return rows.length > 0;
};

export const getAllSessions = async (req, res) => {
    try {
        const cacheKey = 'all_sessions';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Sessions fetched successfully (from cache)');

        const db = await getDBPool();
        // Mengambil data sesi dasar
        const rows = await db.query('SELECT id, title, deskripsi, trainer_id, start_time, end_time, price, status FROM session');

        cache.set(cacheKey, rows, 600);
        return success(res, rows, 'Sessions fetched successfully');
    } catch (err) {
        console.error('Fetch sessions error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getSessionById = async (req, res) => {
    try {
        const {id} = req.params;
        const cacheKey = `session_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Session fetched successfully (from cache)');

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT id, title, deskripsi, trainer_id, start_time, end_time, price, status FROM session WHERE id = ?',
            [id]
        );
        if (rows.length === 0) return error(res, 'Session not found', 404);

        cache.set(cacheKey, rows[0], 600);
        return success(res, rows[0], 'Session fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const createSession = async (req, res) => {
    try {
        const {title, deskripsi, trainer_id, start_time, end_time, price, status = 'scheduled'} = req.body;

        if (!title || !trainer_id || !start_time) {
            return error(res, 'title, trainer_id, and start_time are required', 400);
        }

        const db = await getDBPool();

        /**
         * Validasi: Pastikan trainer_id benar-benar ada di tabel trainer[cite: 2, 13]
         */
        if (!(await isValidTrainer(db, trainer_id))) {
            return error(res, 'Invalid trainer_id. Trainer does not exist.', 400);
        }

        const result = await db.query(
            'INSERT INTO session (title, deskripsi, trainer_id, start_time, end_time, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, deskripsi, trainer_id, start_time, end_time, price, status]
        );

        // Invalidate relevant cache
        cache.del('all_sessions');
        cache.del('view_upcoming_sessions');
        cache.del('upcoming_sessions');

        return success(res, {id: Number(result.insertId)}, 'Session created successfully', 201);
    } catch (err) {
        console.error('Create session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Daftar status yang diizinkan sesuai ENUM database
const validSessionStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled'];

export const updateSession = async (req, res) => {
    console.log('[Controller] updateSession called', req.params.id, req.body);
    try {
        const { id } = req.params;
        const db = await getDBPool();

        // Daftar kolom yang diizinkan untuk diupdate
        const allowedFields = ['title', 'deskripsi', 'trainer_id', 'start_time', 'end_time', 'price', 'status'];
        const fields = [];
        const values = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                // Validasi khusus untuk kolom 'trainer_id'[cite: 2, 13]
                if (field === 'trainer_id') {
                    if (!(await isValidTrainer(db, req.body.trainer_id))) {
                        return error(res, 'Invalid trainer_id. Trainer not found.', 400);
                    }
                }

                // Validasi khusus untuk kolom 'status'
                if (field === 'status') {
                    if (!validSessionStatuses.includes(req.body.status)) {
                        return error(res, `Invalid status. Valid options: ${validSessionStatuses.join(', ')}`, 400);
                    }
                }

                fields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        }

        if (fields.length === 0) {
            return error(res, 'No fields to update', 400);
        }

        values.push(id);
        const result = await db.query(`UPDATE session SET ${fields.join(', ')} WHERE id = ?`, values);

        if (result.affectedRows === 0) {
            return error(res, 'Session not found', 404);
        }

        // Membersihkan cache agar data terbaru segera terlihat[cite: 13]
        cache.del('all_sessions');
        cache.del(`session_${id}`);
        cache.del('upcoming_sessions');
        cache.del('view_upcoming_sessions');

        console.log('[Cache] Invalidated sessions cache for', id);

        return success(res, null, 'Session updated successfully');
    } catch (err) {
        console.error('Update session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const db = await getDBPool();
        const [sessionRows] = await db.query('SELECT trainer_id FROM session WHERE id = ?', [id]);

        if (sessionRows.length === 0) return error(res, 'Session not found', 404);

        // Hanya Admin atau Trainer pemilik sesi yang bisa menghapus[cite: 13, 14]
        if (userRole !== 'admin' && sessionRows[0].trainer_id !== userId) {
            return error(res, 'Forbidden: You can only delete your own sessions', 403);
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // Hapus booking terkait terlebih dahulu (Constraint Integrity)[cite: 2, 13]
            await connection.query('DELETE FROM booking WHERE session_id = ?', [id]);
            await connection.query('DELETE FROM session WHERE id = ?', [id]);
            await connection.commit();

            cache.del('all_sessions');
            cache.del(`session_${id}`);
            cache.del('upcoming_sessions');

            return success(res, null, 'Session deleted successfully');
        } catch (err) {
            await connection.rollback();
            console(err);
        } finally {
            connection.release();
        }
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const getUpcomingSessions = async (req, res) => {
    try {
        const cacheKey = 'upcoming_sessions';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Fetched from cache');

        const db = await getDBPool();
        /**
         * Mengambil dari View. Pastikan View 'upcoming_sessions_for_members'
         * di database sudah JOIN ke tabel 'trainer'.[cite: 2, 13]
         */
        const rows = await db.query(`
            SELECT 
                session_id as id, title, trainer_id, trainer_name, 
                start_time, end_time, price, confirmed_customers, total_bookings
            FROM upcoming_sessions_for_members
        `);

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'Upcoming sessions fetched');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};
