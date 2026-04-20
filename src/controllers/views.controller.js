import { getDBPool } from '../config/db.js';
import { success, error } from '../utils/response.js';
// Get all customer booking history
const CustomerBookingHistory = async (req, res) => {
    console.log('[Controller] CustomerBookingHistory called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM customer_booking_history');
        return success(res, rows, 'Customer booking history fetched successfully');
    } catch (err) {
        console.error('Fetch customer booking history error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get customer booking history by ID
const CustomerBookingHistoryId = async (req, res) => {
    console.log('[Controller] CustomerBookingHistoryId called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM customer_booking_history WHERE customer_id = ?', [id]);
        if (rows.length === 0) {
            return error(res, 'Customer booking history not found', 404);
        }
        return success(res, rows, 'Customer booking history fetched successfully');
    } catch (err) {
        console.error('Fetch customer booking history error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get all matched trainer-customer pairs
const matched_trainer_customer = async (req, res) => {
    console.log('[Controller] matched_trainer_customer called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM matched_trainer_customer');
        if (rows.length === 0) {
            return error(res, 'Matched trainer customer not found', 404);
        }
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
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM member_progress_summary WHERE member_id = ?', [id]);
        if (rows.length === 0) {
            return error(res, 'Member progress summary not found', 404);
        }
        return success(res, rows, 'Member progress summary fetched successfully');
    } catch (err) {
        console.error('Fetch member progress summary error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get all member progress summaries
const member_progress_summary = async (req, res) => {
    console.log('[Controller] member_progress_summary called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM member_progress_summary');
        if (rows.length === 0) {
            return error(res, 'Member progress summary not found', 404);
        }
        return success(res, rows, 'Member progress summary fetched successfully');
    } catch (err) {
        console.error('Fetch member progress summary error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get session participants
const session_participants = async (req, res) => {
    console.log('[Controller] session_participants called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();

        let query = 'SELECT * FROM session_participants';
        let params = [];

        if (id) {
            query += ' WHERE session_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);
        if (rows.length === 0) {
            return error(res, 'Session participants not found', 404);
        }
        return success(res, rows, 'Session participants fetched successfully');
    } catch (err) {
        console.error('Fetch session participants error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get session reviews summary
const session_reviews_summary = async (req, res) => {
    console.log('[Controller] session_reviews_summary called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();

        let query = 'SELECT * FROM session_reviews_summary';
        let params = [];

        if (id) {
            query += ' WHERE session_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);
        if (rows.length === 0) {
            return error(res, 'Session reviews summary not found', 404);
        }
        return success(res, rows, 'Session reviews summary fetched successfully');
    } catch (err) {
        console.error('Fetch session reviews summary error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get trainer schedule
const trainer_schedule = async (req, res) => {
    console.log('[Controller] trainer_schedule called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();

        let query = 'SELECT * FROM trainer_schedule';
        let params = [];

        if (id) {
            query += ' WHERE trainer_id = ?';
            params = [id];
        }

        const rows = await db.query(query, params);
        if (rows.length === 0) {
            return error(res, 'Trainer schedule not found', 404);
        }
        return success(res, rows, 'Trainer schedule fetched successfully');
    } catch (err) {
        console.error('Fetch trainer schedule error:', err);
        return error(res, 'Internal server error', 500);
    }
};

// Get upcoming sessions for members
const upcoming_sessions_for_members = async (req, res) => {
    console.log('[Controller] upcoming_sessions_for_members called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM upcoming_sessions_for_members');
        if (rows.length === 0) {
            return error(res, 'Upcoming sessions not found', 404);
        }
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