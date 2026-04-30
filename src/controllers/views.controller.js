import { getDBPool } from '../config/db.js';
import { success, error } from '../utils/response.js';
import cache from '../utils/cache.js';

// 1. Ambil semua riwayat booking customer (Khusus Admin)
export const CustomerBookingHistory = async (req, res) => {
    try {
        const cacheKey = 'view_customer_booking_history';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Fetched from cache');

        const db = await getDBPool();
        // View ini harus diupdate di DB agar JOIN ke tabel 'user' dan 'trainer' yang baru
        const rows = await db.query(
            'SELECT session_title, trainer_name, customer_id, customer_name, booking_id, start_time, end_time, status, booked_on FROM customer_booking_history'
        );

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'Customer booking history fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 2. Ambil riwayat booking berdasarkan ID Customer
export const CustomerBookingHistoryId = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return error(res, 'Forbidden: Access denied', 403);
        }

        const cacheKey = `view_customer_booking_history_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Fetched from cache');

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT * FROM customer_booking_history WHERE customer_id = ?',
            [id]
        );

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'Customer booking history fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 3. Ambil rangkuman progres member (Berdasarkan ID)
export const member_progress_summary_id = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return error(res, 'Forbidden', 403);
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT progress_id, member_id, member_name, activity, duration, note, recorded_at FROM member_progress_summary WHERE member_id = ?',
            [id]
        );

        return success(res, rows, 'Progress summary fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 4. Ambil jadwal pelatih (Berdasarkan ID Trainer)
export const trainer_schedule = async (req, res) => {
    try {
        const { id } = req.params;
        const trainerId = id || req.user.id;

        const db = await getDBPool();
        // View 'trainer_schedule' di DB harus JOIN ke tabel 'trainer' yang baru
        const rows = await db.query(
            'SELECT trainer_id, trainer_name, session_id, title, start_time, end_time, confirmed_customers FROM trainer_schedule WHERE trainer_id = ?',
            [trainerId]
        );

        return success(res, rows, 'Trainer schedule fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 5. Sesi mendatang untuk member
export const upcoming_sessions_for_members = async (req, res) => {
    try {
        const db = await getDBPool();
        // Mengambil kolom yang sudah dihitung oleh View di database
        const rows = await db.query(`
            SELECT session_id AS id, title, trainer_id, trainer_name, 
                   start_time, end_time, price, confirmed_customers, total_bookings
            FROM upcoming_sessions_for_members
        `);

        return success(res, rows, 'Upcoming sessions fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};
export const matched_trainer_customer = async (req, res) => {
    try {
        const cacheKey = 'view_matched_trainer_customer';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Matched trainer customer fetched (cache)');

        const db = await getDBPool();
        // View ini menggabungkan tabel trainer dan user (customer)
        const rows = await db.query(
            'SELECT session_id, session_title, trainer_id, trainer_name, trainer_email, start_time, customer_id, customer_name, customer_email, status, datetime_created FROM matched_trainer_customer'
        );

        cache.set(cacheKey, rows, 600);
        return success(res, rows, 'Matched trainer customer fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 2. Get all member progress summaries (Trainers & Admins only)
export const member_progress_summary = async (req, res) => {
    try {
        const cacheKey = 'view_member_progress_summary';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Member progress summary fetched (cache)');

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT progress_id, member_id, member_name, activity, duration, note, recorded_at FROM member_progress_summary'
        );

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'Member progress summary fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 3. Get session participants (All or by session ID)
export const session_participants = async (req, res) => {
    try {
        const { id } = req.params; // session_id
        const cacheKey = id ? `view_session_participants_${id}` : 'view_session_participants';

        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Session participants fetched (cache)');

        const db = await getDBPool();
        let query = 'SELECT * FROM session_participants';
        let params = [];

        if (id) {
            query += ' WHERE session_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);
        cache.set(cacheKey, rows, 300);

        return success(res, rows, 'Session participants fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

// 4. Get session reviews summary (All or by session ID)
export const session_reviews_summary = async (req, res) => {
    try {
        const { id } = req.params; // session_id
        const cacheKey = id ? `view_session_reviews_summary_${id}` : 'view_session_reviews_summary';

        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Session reviews summary fetched (cache)');

        const db = await getDBPool();
        let query = 'SELECT review_id, session_id, session_title, trainer_name, customer_name, rating_score, comment FROM session_reviews_summary';
        let params = [];

        if (id) {
            query += ' WHERE session_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);
        cache.set(cacheKey, rows, 600);

        return success(res, rows, 'Session reviews summary fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};
