import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

export const getAllProgress = async (req, res) => {
    try {
        const db = await getDBPool();
        const [rows] = await db.query('SELECT * FROM progress');
        return success(res, rows, 'All progress fetched successfully');
    } catch (err) {
        console.error('Fetch all progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getMyProgress = async (req, res) => {
    try {
        const member_id = req.user.id;
        const db = await getDBPool();
        const [rows] = await db.query('SELECT * FROM member_progress_summary WHERE member_id = ?', [member_id]);
        return success(res, rows, 'My progress fetched successfully');
    } catch (err) {
        console.error('Fetch my progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const createProgress = async (req, res) => {
    try {
        const { booking_id, activity, duration, note } = req.body;
        const member_id = req.user.id;

        if (!activity || !duration || !note) {
            return error(res, 'Activity, duration, and note are required', 400);
        }

        const db = await getDBPool();

        // Validasi booking_id jika diberikan: harus milik member dan status Confirmed (opsional)
        if (booking_id) {
            const [booking] = await db.query(
                'SELECT id FROM booking WHERE id = ? AND member_id = ? AND status = \'Confirmed\'',
                [booking_id, member_id]
            );
            if (booking.length === 0) {
                return error(res, 'Booking not found, not yours, or not confirmed', 400);
            }
        }

        const [result] = await db.query(
            'INSERT INTO progress (member_id, booking_id, activity, duration, note) VALUES (?, ?, ?, ?, ?)',
            [member_id, booking_id || null, activity, duration, note]
        );
        return success(res, { id: result.insertId }, 'Progress recorded successfully', 201);
    } catch (err) {
        console.error('Create progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteProgress = async (req, res) => {
    try {
        const { id } = req.params;
        const db = await getDBPool();
        const [result] = await db.query('DELETE FROM progress WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return error(res, 'Progress record not found', 404);
        }
        return success(res, null, 'Progress record deleted successfully');
    } catch (err) {
        console.error('Delete progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};