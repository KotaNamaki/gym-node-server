import { getDBPool } from '../config/db.js';
import { success, error } from '../utils/response.js';
import cache from '../utils/cache.js';

// Get all customer booking history (admin only)
const CustomerBookingHistory = async (req, res) => {
    console.log('[Controller] CustomerBookingHistory called');
    try {
        const cacheKey = 'view_customer_booking_history';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Customer booking history fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT session_title, trainer_name, customer_id, customer_name, booking_id, start_time, end_time, status, booked_on FROM customer_booking_history'
        );

        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Customer booking history fetched successfully');
    } catch (err) {
        console.error('Fetch customer booking history error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get customer booking history by customer ID
const CustomerBookingHistoryId = async (req, res) => {
    console.log('[Controller] CustomerBookingHistoryId called', req.params.id);
    try {
        const { id } = req.params;

        // Only admin or the customer themselves can view
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return error(res, 'Forbidden: You can only view your own booking history', 403);
        }

        const cacheKey = `view_customer_booking_history_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Customer booking history fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT session_title, trainer_name, customer_id, customer_name, booking_id, start_time, end_time, status, booked_on FROM customer_booking_history WHERE customer_id = ?',
            [id]
        );

        // FIX: Return empty array instead of 404 — a customer with no bookings is valid
        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Customer booking history fetched successfully');
    } catch (err) {
        console.error('Fetch customer booking history error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get all matched trainer-customer pairs (Confirmed bookings only)
const matched_trainer_customer = async (req, res) => {
    console.log('[Controller] matched_trainer_customer called');
    try {
        const cacheKey = 'view_matched_trainer_customer';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Matched trainer customer fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT session_id, session_title, trainer_id, trainer_name, trainer_email, start_time, customer_id, customer_name, customer_email, status, datetime_created FROM matched_trainer_customer'
        );

        cache.set(cacheKey, rows, 600);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Matched trainer customer fetched successfully');
    } catch (err) {
        console.error('Fetch matched trainer customer error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get member progress summary by member ID
const member_progress_summary_id = async (req, res) => {
    console.log('[Controller] member_progress_summary_id called', req.params.id);
    try {
        const { id } = req.params;

        // Only admin or the member themselves can view
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return error(res, 'Forbidden: You can only view your own progress', 403);
        }

        const cacheKey = `view_member_progress_summary_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Member progress summary fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT progress_id, member_id, member_name, activity, duration, note, recorded_at FROM member_progress_summary WHERE member_id = ?',
            [id]
        );

        // FIX: Return empty array instead of 404 — a member with no progress is valid
        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Member progress summary fetched successfully');
    } catch (err) {
        console.error('Fetch member progress summary error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get all member progress summaries (admin only)
const member_progress_summary = async (req, res) => {
    console.log('[Controller] member_progress_summary called');
    try {
        const cacheKey = 'view_member_progress_summary';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Member progress summary fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT progress_id, member_id, member_name, activity, duration, note, recorded_at FROM member_progress_summary'
        );

        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Member progress summary fetched successfully');
    } catch (err) {
        console.error('Fetch member progress summary error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get session participants (all or by session ID)
const session_participants = async (req, res) => {
    console.log('[Controller] session_participants called', req.params.id);
    try {
        const { id } = req.params;
        const cacheKey = id ? `view_session_participants_${id}` : 'view_session_participants';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return success(res, cachedData, 'Session participants fetched successfully (from cache)');
        }

        const db = await getDBPool();

        // FIX: Use the session_participants view directly instead of rebuilding the join manually
        let query = `
            SELECT
                booking_id, session_id, title, start_time, end_time, price,
                trainer_id, trainer_name, member_id, member_name, member_email, status
            FROM session_participants
        `;
        let params = [];

        if (id) {
            query += ' WHERE session_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'Session participants fetched successfully');
    } catch (err) {
        console.error('Fetch session participants error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get session reviews summary (all or by session ID)
const session_reviews_summary = async (req, res) => {
    console.log('[Controller] session_reviews_summary called', req.params.id);
    try {
        const { id } = req.params;
        const cacheKey = id ? `view_session_reviews_summary_${id}` : 'view_session_reviews_summary';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Session reviews summary fetched successfully (from cache)');
        }

        const db = await getDBPool();

        let query = 'SELECT review_id, session_id, session_title, trainer_name, customer_name, rating_score, comment FROM session_reviews_summary';
        let params = [];

        if (id) {
            query += ' WHERE session_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);

        // FIX: Return empty array instead of 404 — a session with no reviews is valid
        cache.set(cacheKey, rows, 600);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Session reviews summary fetched successfully');
    } catch (err) {
        console.error('Fetch session reviews summary error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get trainer schedule (all or by trainer ID)
const trainer_schedule = async (req, res) => {
    console.log('[Controller] trainer_schedule called', req.params.id);
    try {
        const { id } = req.params;
        const cacheKey = id ? `view_trainer_schedule_${id}` : 'view_trainer_schedule';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Trainer schedule fetched successfully (from cache)');
        }

        const db = await getDBPool();

        let query = 'SELECT trainer_id, trainer_name, session_id, title, start_time, end_time, confirmed_customers FROM trainer_schedule';
        let params = [];

        if (id) {
            query += ' WHERE trainer_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);

        // FIX: Return empty array instead of 404 — a trainer with no scheduled sessions is valid
        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, rows, 'Trainer schedule fetched successfully');
    } catch (err) {
        console.error('Fetch trainer schedule error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get upcoming sessions for members
const upcoming_sessions_for_members = async (req, res) => {
    try {
        const cacheKey = 'view_upcoming_sessions';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Fetched from cache');

        const db = await getDBPool();

        // FIX: Removed the broken correlated subquery that referenced alias 's'
        // from within the same SELECT level. The view already provides these columns.
        const rows = await db.query(`
            SELECT
                session_id AS id,
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
        return success(res, rows, 'Upcoming sessions fetched successfully');
    } catch (err) {
        console.error('Fetch upcoming sessions error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export {
    CustomerBookingHistory,
    CustomerBookingHistoryId,
    matched_trainer_customer,
    member_progress_summary_id,
    member_progress_summary,
    session_participants,
    session_reviews_summary,
    trainer_schedule,
    upcoming_sessions_for_members
};
