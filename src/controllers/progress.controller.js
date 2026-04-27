import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

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
        const cachedData = (await import('../utils/cache.js')).default.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'My progress fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query('SELECT progress_id, member_id, member_name, activity, duration, note, recorded_at FROM member_progress_summary WHERE member_id = ?', [member_id]);
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

        // Validasi booking_id jika diberikan: harus milik member dan status Confirmed (opsional)
        if (booking_id) {
            const booking = await db.query(
                'SELECT id FROM booking WHERE id = ? AND member_id = ? AND status = \'Confirmed\'',
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

        // Invalidate cache
        import('../utils/cache.js').then(cache => {
            cache.default.del('view_member_progress_summary');
            cache.default.del(`view_member_progress_summary_${member_id}`);
            console.log('[Cache] Invalidated progress summary cache');
        });

        return success(res, { id: Number(result.insertId) }, 'Progress recorded successfully', 201);
    } catch (err) {
        console.error('Create progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteProgress = async (req, res) => {
    console.log('[Controller] deleteProgress called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();

        // Fetch member_id for invalidation before deleting
        const progressRows = await db.query('SELECT member_id FROM progress WHERE id = ?', [id]);

        const result = await db.query('DELETE FROM progress WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return error(res, 'Progress record not found', 404);
        }

        // Invalidate cache
        if (progressRows.length > 0) {
            const member_id = progressRows[0].member_id;
            import('../utils/cache.js').then(cache => {
                cache.default.del('view_member_progress_summary');
                cache.default.del(`view_member_progress_summary_${member_id}`);
                console.log('[Cache] Invalidated progress summary cache for member', member_id);
            });
        }

        return success(res, null, 'Progress record deleted successfully');
    } catch (err) {
        console.error('Delete progress error:', err);
        return error(res, 'Internal server error', 500);
    }
};
