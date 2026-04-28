import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';
import cache from '../utils/cache.js';

export const getAllBookings = async (req, res) => {
    try {
        const cacheKey = 'all_bookings';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Fetched from cache');

        const db = await getDBPool();
        // FIX: Was querying 'progress' table instead of 'booking'
        const rows = await db.query('SELECT id, session_id, member_id, status, datetime_created, member_name FROM booking');

        cache.set(cacheKey, rows, 300);
        return success(res, rows, 'All bookings fetched');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const getBookingById = async (req, res) => {
    console.log('[Controller] getBookingById called', req.params.id);
    try {
        const {id} = req.params;
        const db = await getDBPool();
        const rows = await db.query('SELECT id, session_id, member_id, status, datetime_created FROM booking WHERE id = ?', [id]);
        if (rows.length === 0) {
            return error(res, 'Booking not found', 404);
        }

        const booking = rows[0];
        // Only admin or the member who made the booking can access it
        if (req.user.role !== 'admin' && req.user.id !== booking.member_id) {
            return error(res, 'Forbidden: You can only access your own bookings', 403);
        }

        return success(res, booking, 'Booking fetched successfully');
    } catch (err) {
        console.error('Fetch booking error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const createBooking = async (req, res) => {
    console.log('[Controller] createBooking called', req.body);
    try {
        const { session_id, status = 'Pending' } = req.body;
        const member_id = req.user.id;

        if (!session_id) {
            return error(res, 'session_id is required', 400);
        }

        const db = await getDBPool();

        // 1. Validate: only customers can book
        const userRows = await db.query('SELECT id, role, nama, email FROM user WHERE id = ?', [member_id]);
        if (userRows.length === 0) {
            return error(res, 'User not found', 404);
        }

        if (userRows[0].role !== 'customer') {
            return error(res, 'Only customers can make bookings', 403);
        }

        const member_name = userRows[0].nama;

        // 2. Check session exists and is valid
        const sessionRows = await db.query(
            `SELECT s.id, s.title, s.start_time, s.end_time, s.price, s.trainer_id, 
                    u.nama as trainer_name
             FROM session s
             LEFT JOIN user u ON s.trainer_id = u.id
             WHERE s.id = ? AND s.status NOT IN ('cancelled', 'completed')`,
            [session_id]
        );

        if (sessionRows.length === 0) {
            return error(res, 'Session not found or no longer available', 404);
        }

        const session = sessionRows[0];

        // 3. Check session hasn't started yet
        const now = new Date();
        const sessionStart = new Date(session.start_time);
        if (sessionStart < now) {
            return error(res, 'Cannot book a session that has already started or passed', 400);
        }

        // 4. Check if user already booked this session
        // FIX: DB enum only has 'Cancel' (not 'Cancelled'/'cancelled'), align with schema
        const existingBooking = await db.query(
            `SELECT id, status FROM booking
             WHERE session_id = ? AND member_id = ?
               AND status != 'Cancel'`,
            [session_id, member_id]
        );

        if (existingBooking.length > 0) {
            return error(res, 'You have already booked this session', 400);
        }

        // 5. Insert booking
        const result = await db.query(
            `INSERT INTO booking (session_id, member_id, status, member_name, datetime_created) 
             VALUES (?, ?, ?, ?, NOW())`,
            [session_id, member_id, status, member_name]
        );

        const bookingId = Number(result.insertId);

        // 6. Invalidate relevant cache
        cache.del('all_bookings');
        cache.del('booking_stats');
        cache.del('view_customer_booking_history');
        cache.del(`view_customer_booking_history_${member_id}`);
        cache.del(`view_session_participants_${session_id}`);
        cache.del('view_session_participants');
        cache.del('view_upcoming_sessions');
        cache.del(`customer_booking_history_${member_id}`);

        console.log('[Cache] Invalidated booking cache for session', session_id, 'and member', member_id);

        return success(res, {
            id: bookingId,
            session_id: session_id,
            session_title: session.title,
            member_id: member_id,
            member_name: member_name,
            status: status,
            trainer_name: session.trainer_name,
            booking_time: new Date().toISOString()
        }, 'Booking created successfully', 201);

    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY' || err.code === 'ER_DUP_KEY') {
            return error(res, 'You have already booked this session', 400);
        }
        console.error('Create booking error:', err);
        return error(res, 'Internal server error: ' + err.message, 500);
    }
};

export const updateBookingStatus = async (req, res) => {
    console.log('[Controller] updateBookingStatus called', req.params.id, req.body);
    try {
        const { id } = req.params;
        const { status } = req.body;

        // FIX: Align valid statuses with DB enum ('Pending','Confirmed','Cancel')
        const validStatuses = ['Pending', 'Confirmed', 'Cancel'];

        if (!status || !validStatuses.includes(status)) {
            return error(res, 'Invalid status. Valid statuses: Pending, Confirmed, Cancel', 400);
        }

        const db = await getDBPool();

        const rows = await db.query(
            `SELECT b.*, s.trainer_id, s.start_time
             FROM booking b
                      JOIN session s ON b.session_id = s.id
             WHERE b.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return error(res, 'Booking not found', 404);
        }

        const booking = rows[0];

        // Authorization checks
        if (req.user.role !== 'admin') {
            if (req.user.role === 'customer') {
                if (req.user.id !== booking.member_id) {
                    return error(res, 'Forbidden: You can only update your own bookings', 403);
                }
                // FIX: customers can only cancel ('Cancel' to match DB enum)
                if (status !== 'Cancel') {
                    return error(res, 'Forbidden: Customers can only cancel their bookings', 403);
                }
            } else if (req.user.role === 'trainer') {
                if (req.user.id !== booking.trainer_id) {
                    return error(res, 'Forbidden: You can only update bookings for your sessions', 403);
                }
                if (status !== 'Confirmed' && status !== 'Cancel') {
                    return error(res, 'Forbidden: Trainers can only confirm or cancel bookings', 403);
                }
            }
        }

        // Cannot modify already-cancelled bookings
        if (booking.status === 'Cancel') {
            return error(res, 'Cannot modify a cancelled booking', 400);
        }

        const result = await db.query(
            'UPDATE booking SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return error(res, 'Booking not found', 404);
        }

        // Invalidate all relevant cache
        cache.del('all_bookings');
        cache.del('booking_stats');
        cache.del('view_customer_booking_history');
        cache.del(`view_customer_booking_history_${booking.member_id}`);
        cache.del(`view_session_participants_${booking.session_id}`);
        cache.del('view_session_participants');
        cache.del('view_upcoming_sessions');
        cache.del(`customer_booking_history_${booking.member_id}`);

        console.log('[Cache] Invalidated booking cache for ID:', id);

        return success(res, {
            id: Number(id),
            status: status,
            message: 'Booking status updated successfully'
        }, 'Booking status updated successfully');

    } catch (err) {
        console.error('Update booking status error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getMyBookings = async (req, res) => {
    console.log('[Controller] getMyBookings called for user:', req.user.id);
    try {
        const member_id = req.user.id;
        const cacheKey = `customer_booking_history_${member_id}`;

        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'My bookings fetched successfully (from cache)');
        }

        const db = await getDBPool();

        const rows = await db.query(
            `SELECT 
                b.id as booking_id,
                b.session_id,
                b.status,
                b.datetime_created as booked_on,
                s.title as session_title,
                s.deskripsi as session_description,
                s.start_time,
                s.end_time,
                s.price,
                u.nama as trainer_name,
                s.trainer_id
             FROM booking b
             JOIN session s ON b.session_id = s.id
             LEFT JOIN user u ON s.trainer_id = u.id
             WHERE b.member_id = ?
             ORDER BY b.datetime_created DESC`,
            [member_id]
        );

        cache.set(cacheKey, rows, 300);
        console.log('[Cache] Miss for', cacheKey, `- ${rows.length} bookings cached`);

        return success(res, rows, 'My bookings fetched successfully');
    } catch (err) {
        console.error('Fetch my bookings error:', err);
        return error(res, 'Internal server error', 500);
    }
};
