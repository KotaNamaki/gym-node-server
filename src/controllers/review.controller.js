import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

export const getAllReviews = async (req, res) => {
    console.log('[Controller] getAllReviews called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT id, session_id, member_id, rating_score, comment, datetime_created FROM reviews');
        return success(res, rows, 'All reviews fetched successfully');
    } catch (err) {
        console.error('Fetch reviews error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getSessionReviews = async (req, res) => {
    console.log('[Controller] getSessionReviews called', req.params.session_id);
    try {
        const {session_id} = req.params;
        const db = await getDBPool();
        const rows = await db.query('SELECT session_id, session_title, rating_score, trainer_name, customer_name, comment FROM session_reviews_summary WHERE session_id = ?', [session_id]);
        return success(res, rows, 'Session reviews fetched successfully');
    } catch (err) {
        console.error('Fetch session reviews error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const createReview = async (req, res) => {
    console.log('[Controller] createReview called', req.body);
    try {
        const {session_id, rating_score, comment} = req.body;
        const member_id = req.user.id;

        if (!session_id || !rating_score) {
            return error(res, 'Session_id and rating_score are required', 400);
        }

        if (rating_score < 1 || rating_score > 5) {
            return error(res, 'Rating score must be between 1 and 5', 400);
        }

        const db = await getDBPool();

        // Cek apakah member pernah booking session ini dengan status Confirmed
        const booking = await db.query(
            `SELECT id FROM booking 
             WHERE session_id = ? AND member_id = ? AND status = 'Confirmed'`,
            [session_id, member_id]
        );
        if (booking.length === 0) {
            return error(res, 'You can only review sessions you have attended and confirmed', 400);
        }

        // Cegah review ganda untuk session yang sama (opsional)
        const existingReview = await db.query(
            'SELECT id FROM reviews WHERE session_id = ? AND member_id = ?',
            [session_id, member_id]
        );
        if (existingReview.length > 0) {
            return error(res, 'You have already reviewed this session', 400);
        }

        const result = await db.query(
            'INSERT INTO reviews (session_id, member_id, rating_score, comment) VALUES (?, ?, ?, ?)',
            [session_id, member_id, rating_score, comment || null]
        );

        // Invalidate cache
        import('../utils/cache.js').then(cache => {
            cache.default.del('view_session_reviews_summary');
            cache.default.del(`view_session_reviews_summary_${session_id}`);
            console.log('[Cache] Invalidated review summary cache');
        });

        return success(res, {id: Number(result.insertId)}, 'Review created successfully', 201);
    } catch (err) {
        console.error('Create review error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteReview = async (req, res) => {
    console.log('[Controller] deleteReview called', req.params.id);
    try {
        const {id} = req.params;
        const db = await getDBPool();

        // Fetch session_id for invalidation before deleting
        const reviewRows = await db.query('SELECT session_id FROM reviews WHERE id = ?', [id]);

        const result = await db.query('DELETE FROM reviews WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return error(res, 'Review not found', 404);
        }

        // Invalidate cache
        if (reviewRows.length > 0) {
            const session_id = reviewRows[0].session_id;
            import('../utils/cache.js').then(cache => {
                cache.default.del('view_session_reviews_summary');
                cache.default.del(`view_session_reviews_summary_${session_id}`);
                console.log('[Cache] Invalidated review summary cache for session', session_id);
            });
        }

        return success(res, null, 'Review deleted successfully');
    } catch (err) {
        console.error('Delete review error:', err);
        return error(res, 'Internal server error', 500);
    }
};
