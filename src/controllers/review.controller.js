import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';
import cache from '../utils/cache.js';

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
        const rows = await db.query(
            'SELECT session_id, session_title, rating_score, trainer_name, customer_name, comment FROM session_reviews_summary WHERE session_id = ?',
            [session_id]
        );
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

        // Tambahan: Pastikan hanya customer yang bisa membuat review
        if (req.user.role !== 'customer') {
            return error(res, 'Only customers can review sessions', 403);
        }

        if (!session_id || !rating_score) {
            return error(res, 'Session_id and rating_score are required', 400);
        }

        if (rating_score < 1 || rating_score > 5) {
            return error(res, 'Rating score must be between 1 and 5', 400);
        }

        const db = await getDBPool();

        // Check member had a Confirmed booking for this session
        const booking = await db.query(
            `SELECT id FROM booking
             WHERE session_id = ? AND member_id = ? AND status = 'Confirmed'`,
            [session_id, member_id]
        );
        if (booking.length === 0) {
            return error(res, 'You can only review sessions you have attended and confirmed', 400);
        }

        // Prevent duplicate reviews
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

        // FIX: Use top-level cache import synchronously
        cache.del('view_session_reviews_summary');
        cache.del(`view_session_reviews_summary_${session_id}`);
        console.log('[Cache] Invalidated review summary cache');

        return success(res, {id: Number(result.insertId)}, 'Review created successfully', 201);
    } catch (err) {
        console.error('Create review error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const updateReview = async (req, res) => {
    console.log('[Controller] updateReview called', req.params.id);
    try {
        const { id } = req.params;
        const { rating_score, comment } = req.body;
        const member_id = req.user.id;

        if (rating_score !== undefined && (rating_score < 1 || rating_score > 5)) {
            return error(res, 'Rating score must be between 1 and 5', 400);
        }

        const db = await getDBPool();

        // Check ownership
        const reviewRows = await db.query('SELECT id, member_id, session_id FROM reviews WHERE id = ?', [id]);
        if (reviewRows.length === 0) {
            return error(res, 'Review not found', 404);
        }

        if (req.user.role !== 'admin' && reviewRows[0].member_id !== member_id) {
            return error(res, 'Forbidden: You can only update your own reviews', 403);
        }

        const fields = [];
        const values = [];

        if (rating_score !== undefined) { fields.push('rating_score = ?'); values.push(rating_score); }
        if (comment !== undefined)      { fields.push('comment = ?');      values.push(comment); }

        if (fields.length === 0) {
            return error(res, 'No fields to update', 400);
        }

        values.push(id);
        await db.query(`UPDATE reviews SET ${fields.join(', ')} WHERE id = ?`, values);

        // Invalidate cache
        const session_id = reviewRows[0].session_id;
        cache.del('view_session_reviews_summary');
        cache.del(`view_session_reviews_summary_${session_id}`);
        console.log('[Cache] Invalidated review summary cache for session', session_id);

        return success(res, null, 'Review updated successfully');
    } catch (err) {
        console.error('Update review error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const deleteReview = async (req, res) => {
    console.log('[Controller] deleteReview called', req.params.id);
    try {
        const {id} = req.params;
        const db = await getDBPool();

        // Fetch session_id and member for ownership check + cache invalidation before deleting
        const reviewRows = await db.query('SELECT session_id, member_id FROM reviews WHERE id = ?', [id]);
        if (reviewRows.length === 0) {
            return error(res, 'Review not found', 404);
        }

        // Only admin or the review author can delete
        if (req.user.role !== 'admin' && reviewRows[0].member_id !== req.user.id) {
            return error(res, 'Forbidden: You can only delete your own reviews', 403);
        }

        const result = await db.query('DELETE FROM reviews WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return error(res, 'Review not found', 404);
        }

        // FIX: Use top-level cache import synchronously
        const session_id = reviewRows[0].session_id;
        cache.del('view_session_reviews_summary');
        cache.del(`view_session_reviews_summary_${session_id}`);
        console.log('[Cache] Invalidated review summary cache for session', session_id);

        return success(res, null, 'Review deleted successfully');
    } catch (err) {
        console.error('Delete review error:', err);
        return error(res, 'Internal server error', 500);
    }
};
