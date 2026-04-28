import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';
import cache from '../utils/cache.js';

const validSessionStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled'];

const isValidTrainer = async (db, trainer_id) => {
    const rows = await db.query("SELECT id FROM user WHERE id = ? AND role = 'trainer'", [trainer_id]);
    return rows.length > 0;
};

export const getAllSessions = async (req, res) => {
    console.log('[Controller] getAllSessions called');
    try {
        const cacheKey = 'all_sessions';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Sessions fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query('SELECT id, title, deskripsi, trainer_id, start_time, end_time, price, status FROM session');

        cache.set(cacheKey, rows, 600);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Sessions fetched successfully');
    } catch (err) {
        console.error('Fetch sessions error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getSessionById = async (req, res) => {
    console.log('[Controller] getSessionById called', req.params.id);
    try {
        const {id} = req.params;
        const cacheKey = `session_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Session fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT id, title, deskripsi, trainer_id, start_time, end_time, price, status FROM session WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return error(res, 'Session not found', 404);
        }

        cache.set(cacheKey, rows[0], 600);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows[0], 'Session fetched successfully');
    } catch (err) {
        console.error('Fetch session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const createSession = async (req, res) => {
    console.log('[Controller] createSession called', req.body);
    try {
        const {title, deskripsi, trainer_id, start_time, end_time, price, status = 'scheduled'} = req.body;

        if (!title || !trainer_id || !start_time) {
            return error(res, 'title, trainer_id, and start_time are required', 400);
        }

        if (!validSessionStatuses.includes(status)) {
            return error(res, 'Invalid session status', 400);
        }

        const db = await getDBPool();

        if (!(await isValidTrainer(db, trainer_id))) {
            return error(res, 'Invalid trainer_id or user is not a trainer', 400);
        }

        const result = await db.query(
            'INSERT INTO session (title, deskripsi, trainer_id, start_time, end_time, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, deskripsi, trainer_id, start_time, end_time, price, status]
        );

        const newId = Number(result.insertId);

        cache.del('all_sessions');
        cache.del('session_stats');
        cache.del('view_upcoming_sessions');
        cache.del('upcoming_sessions');

        return success(res, {id: newId}, 'Session created successfully', 201);
    } catch (err) {
        console.error('Create session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const updateSession = async (req, res) => {
    console.log('[Controller] updateSession called', req.params.id, req.body);
    try {
        const { id } = req.params;
        const db = await getDBPool();
        const allowedFields = ['title', 'deskripsi', 'trainer_id', 'start_time', 'end_time', 'price', 'status'];
        const fields = [];
        const values = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                if (field === 'trainer_id') {
                    if (!(await isValidTrainer(db, req.body.trainer_id))) {
                        return error(res, 'Invalid trainer_id or user is not a trainer', 400);
                    }
                }
                if (field === 'status' && !validSessionStatuses.includes(req.body.status)) {
                    return error(res, 'Invalid session status', 400);
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

        cache.del('all_sessions');
        cache.del(`session_${id}`);
        cache.del('upcoming_sessions');
        cache.del('view_upcoming_sessions');
        cache.del('session_stats');
        cache.del(`view_session_participants_${id}`);
        cache.del('view_session_participants');
        console.log('[Cache] Invalidated sessions cache for', id);

        return success(res, null, 'Session updated successfully');
    } catch (err) {
        console.error('Update session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteSession = async (req, res) => {
    console.log('[Controller] deleteSession called', req.params.id);
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const db = await getDBPool();

        const sessionRows = await db.query('SELECT trainer_id, title FROM session WHERE id = ?', [id]);
        if (sessionRows.length === 0) {
            return error(res, 'Session not found', 404);
        }

        const session = sessionRows[0];

        if (userRole !== 'admin' && session.trainer_id !== userId) {
            return error(res, 'Forbidden: You can only delete your own sessions', 403);
        }

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const deletedBookings = await connection.query('DELETE FROM booking WHERE session_id = ?', [id]);
            const result = await connection.query('DELETE FROM session WHERE id = ?', [id]);

            if (result.affectedRows === 0) {
                await connection.rollback();
                return error(res, 'Session not found', 404);
            }

            await connection.commit();

            cache.del('all_sessions');
            cache.del(`session_${id}`);
            cache.del('upcoming_sessions');
            cache.del('view_upcoming_sessions');
            cache.del('session_stats');
            cache.del(`view_session_participants_${id}`);
            cache.del('view_session_participants');
            cache.del('view_trainer_schedule');
            cache.del('view_customer_booking_history');
            cache.del('all_bookings');
            cache.del('booking_stats');

            console.log('[Cache] Invalidated sessions cache after deletion of', id);

            return success(res, {
                deletedSessionId: Number(id),
                deletedBookings: deletedBookings.affectedRows || 0
            }, `Session "${session.title}" deleted successfully`);

        } catch (err) {
            await connection.rollback();
            console.error('Delete session transaction error:', err);
            // FIX: Was incorrectly assigning to error.message (treating error fn as object)
            return error(res, 'Internal server error: ' + err.message, 500);
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error('Delete session error:', err);
        return error(res, 'Internal server error: ' + err.message, 500);
    }
};

export const getUpcomingSessions = async (req, res) => {
    console.log('[Controller] getUpcomingSessions called');
    try {
        const cacheKey = 'upcoming_sessions';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Upcoming sessions fetched successfully (from cache)');
        }

        const db = await getDBPool();
        // FIX: View already computes confirmed_customers & total_bookings; removed
        // the broken subquery that referenced alias 's' from within the same SELECT
        const rows = await db.query(`
            SELECT 
                session_id as id,
                title,
                trainer_id,
                trainer_name,
                start_time,
                end_time,
                price,
                confirmed_customers,
                total_bookings
            FROM upcoming_sessions_for_members
        `);

        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Upcoming sessions fetched successfully');
    } catch (err) {
        console.error('Fetch upcoming sessions error:', err);
        return error(res, 'Internal server error', 500);
    }
};
