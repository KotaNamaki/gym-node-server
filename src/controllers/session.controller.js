import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

const validSessionStatuses = ['scheduled', 'ongoing', 'completed', 'cancelled'];

// Helper untuk validasi trainer
const isValidTrainer = async (db, trainer_id) => {
    const rows = await db.query('SELECT id FROM user WHERE id = ? AND role = \'trainer\'', [trainer_id]);
    return rows.length > 0;
};

export const getAllSessions = async (req, res) => {
    console.log('[Controller] getAllSessions called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM session');
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
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM session WHERE id = ?', [id]);
        if (rows.length === 0) {
            return error(res, 'Session not found', 404);
        }
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
            return error(res, 'Title, trainer_id, and start_time are required', 400);
        }

        const db = await getDBPool();

        // Validasi trainer_id
        if (!(await isValidTrainer(db, trainer_id))) {
            return error(res, 'Invalid trainer_id or user is not a trainer', 400);
        }

        // Validasi status
        if (status && !validSessionStatuses.includes(status)) {
            return error(res, 'Invalid session status', 400);
        }

        const result = await db.query(
            'INSERT INTO session (title, deskripsi, trainer_id, start_time, end_time, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [title, deskripsi, trainer_id, start_time, end_time, price, status]
        );
        return success(res, {id: Number(result.insertId)}, 'Session created successfully', 201);
    } catch (err) {
        console.error('Create session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const updateSession = async (req, res) => {
    console.log('[Controller] updateSession called', req.params.id, req.body);
    try {
        const { id } = req.params;
        const dbCheck = await getDBPool();
        const allowedFields = ['title', 'deskripsi', 'trainer_id', 'start_time', 'end_time', 'price', 'status'];
        const fields = [];
        const values = [];

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                // Validasi khusus untuk trainer_id dan status
                if (field === 'trainer_id') {
                    if (!(await isValidTrainer(dbCheck, req.body.trainer_id))) {
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
        const db = await getDBPool();
        const result = await db.query(`UPDATE session SET ${fields.join(', ')} WHERE id = ?`, values);

        if (result.affectedRows === 0) {
            return error(res, 'Session not found', 404);
        }
        return success(res, null, 'Session updated successfully');
    } catch (err) {
        console.error('Update session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteSession = async (req, res) => {
    console.log('[Controller] deleteSession called', req.params.id);
    try {
        const {id} = req.params;
        const db = await getDBPool();
        const result = await db.query('DELETE FROM session WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return error(res, 'Session not found', 404);
        }
        return success(res, null, 'Session deleted successfully');
    } catch (err) {
        console.error('Delete session error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getUpcomingSessions = async (req, res) => {
    console.log('[Controller] getUpcomingSessions called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM upcoming_sessions_for_members');
        return success(res, rows, 'Upcoming sessions fetched successfully');
    } catch (err) {
        console.error('Fetch upcoming sessions error:', err);
        return error(res, 'Internal server error', 500);
    }
};