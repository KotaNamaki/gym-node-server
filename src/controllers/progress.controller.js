import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';
import cache from '../utils/cache.js';

export const getAllProgress = async (req, res) => {
    console.log('[Controller] getAllProgress called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT id, member_id, booking_id, activity, duration, note, jam_nyatat FROM progress');
        return success(res, rows, 'All progress fetched successfully');
    } catch (err) {
        console.error('Fetch all progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getMyProgress = async (req, res) => {
    console.log('[Controller] getMyProgress called');
    try {
        const member_id = req.user.id;
        const cacheKey = `view_member_progress_summary_${member_id}`;

        // FIX: Use top-level cache import instead of dynamic import each call
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'My progress fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT progress_id, member_id, member_name, activity, duration, note, recorded_at FROM member_progress_summary WHERE member_id = ?',
            [member_id]
        );

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'My progress fetched successfully');
    } catch (err) {
        console.error('Fetch my progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const createProgress = async (req, res) => {
    console.log('[Controller] createProgress called', req.body);
    try {
        const { booking_id, activity, duration, note } = req.body;
        const member_id = req.user.id;

        if (!activity || !duration || !note) {
            return error(res, 'Activity, duration, and note are required', 400);
        }

        const db = await getDBPool();

        // Validate booking_id if provided: must belong to member and be Confirmed
        if (booking_id) {
            const booking = await db.query(
                "SELECT id FROM booking WHERE id = ? AND member_id = ? AND status = 'Confirmed'",
                [booking_id, member_id]
            );
            if (booking.length === 0) {
                return error(res, 'Booking not found, not yours, or not confirmed', 400);
            }
        }

        const result = await db.query(
            'INSERT INTO progress (member_id, booking_id, activity, duration, note) VALUES (?, ?, ?, ?, ?)',
            [member_id, booking_id || null, activity, duration, note]
        );

        // FIX: Use top-level cache import synchronously instead of async dynamic import
        cache.del('view_member_progress_summary');
        cache.del(`view_member_progress_summary_${member_id}`);
        console.log('[Cache] Invalidated progress summary cache');

        return success(res, { id: Number(result.insertId) }, 'Progress recorded successfully', 201);
    } catch (err) {
        console.error('Create progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const updateProgress = async (req, res) => {
    console.log('[Controller] updateProgress called', req.params.id);
    try {
        const { id } = req.params;
        const { activity, duration, note } = req.body;
        const member_id = req.user.id;

        const db = await getDBPool();

        // Check ownership: only the member who created it (or admin) can update
        const progressRows = await db.query('SELECT id, member_id FROM progress WHERE id = ?', [id]);
        if (progressRows.length === 0) {
            return error(res, 'Progress record not found', 404);
        }

        if (req.user.role !== 'admin' && progressRows[0].member_id !== member_id) {
            return error(res, 'Forbidden: You can only update your own progress records', 403);
        }

        const fields = [];
        const values = [];

        if (activity !== undefined) { fields.push('activity = ?'); values.push(activity); }
        if (duration !== undefined) { fields.push('duration = ?'); values.push(duration); }
        if (note !== undefined)     { fields.push('note = ?');     values.push(note); }

        if (fields.length === 0) {
            return error(res, 'No fields to update', 400);
        }

        values.push(id);
        await db.query(`UPDATE progress SET ${fields.join(', ')} WHERE id = ?`, values);

        // Invalidate cache
        cache.del('view_member_progress_summary');
        cache.del(`view_member_progress_summary_${progressRows[0].member_id}`);
        console.log('[Cache] Invalidated progress summary cache for member', progressRows[0].member_id);

        return success(res, null, 'Progress record updated successfully');
    } catch (err) {
        console.error('Update progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteProgress = async (req, res) => {
    console.log('[Controller] deleteProgress called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();

        // Fetch member_id for cache invalidation + ownership check before deleting
        const progressRows = await db.query('SELECT member_id FROM progress WHERE id = ?', [id]);
        if (progressRows.length === 0) {
            return error(res, 'Progress record not found', 404);
        }

        // Only admin or the owning member can delete
        if (req.user.role !== 'admin' && progressRows[0].member_id !== req.user.id) {
            return error(res, 'Forbidden: You can only delete your own progress records', 403);
        }

        const result = await db.query('DELETE FROM progress WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return error(res, 'Progress record not found', 404);
        }

        // FIX: Use top-level cache import synchronously
        const member_id = progressRows[0].member_id;
        cache.del('view_member_progress_summary');
        cache.del(`view_member_progress_summary_${member_id}`);
        console.log('[Cache] Invalidated progress summary cache for member', member_id);

        return success(res, null, 'Progress record deleted successfully');
    } catch (err) {
        console.error('Delete progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};
