import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

export const getAllBookings = async (req, res) => {
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM booking');
        return success(res, rows, 'Bookings fetched successfully');
    } catch (err) {
        console.error('Fetch bookings error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getBookingById = async (req, res) => {
    try {
        const {id} = req.params;
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM booking WHERE id = ?', [id]);
        if (rows.length === 0) {
            return error(res, 'Booking not found', 404);
        }

        const booking = rows[0];
        // BOLA Fix: Only admin or the member who made the booking can access it
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
    try {
        const {session_id, status = 'Pending'} = req.body;
        const member_id = req.user.id;

        if (!session_id) {
            return error(res, 'session_id is required', 400);
        }

        const db = await getDBPool();

        // Validasi: hanya customer yang boleh booking
        const [userRows] = await db.query('SELECT role FROM user WHERE id = ?', [member_id]);
        if (userRows.length === 0 || userRows[0].role !== 'customer') {
            return error(res, 'Only customers can make bookings', 403);
        }

        // Cek apakah session exists
        const [session] = await db.query('SELECT id FROM session WHERE id = ?', [session_id]);
        if (session.length === 0) {
            return error(res, 'Session not found', 404);
        }

        const [result] = await db.query(
            'INSERT INTO booking (session_id, member_id, status) VALUES (?, ?, ?)',
            [session_id, member_id, status]
        );
        return success(res, {id: result.insertId}, 'Booking created successfully', 201);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return error(res, 'You have already booked this session', 400);
        }
        console.error('Create booking error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const updateBookingStatus = async (req, res) => {
    try {
        const {id} = req.params;
        const {status} = req.body;
        const validStatuses = ['Pending', 'Confirmed', 'Cancel'];

        if (!status || !validStatuses.includes(status)) {
            return error(res, 'Invalid status', 400);
        }

        const db = await getDBPool();

        // BOLA and Role Check
        const [rows] = await db.query('SELECT * FROM booking WHERE id = ?', [id]);
        if (rows.length === 0) {
            return error(res, 'Booking not found', 404);
        }

        const booking = rows[0];

        if (req.user.role !== 'admin') {
            // Non-admins (customers) can only cancel their OWN bookings
            if (req.user.id !== booking.member_id) {
                return error(res, 'Forbidden: You can only update your own bookings', 403);
            }
            if (status !== 'Cancel') {
                return error(res, 'Forbidden: Only admin can confirm bookings', 403);
            }
        }

        const [result] = await db.query(
            'UPDATE booking SET status = ? WHERE id = ?',
            [status, id]
        );

        return success(res, null, 'Booking status updated successfully');
    } catch (err) {
        console.error('Update booking status error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getMyBookings = async (req, res) => {
    try {
        const member_id = req.user.id;
        const db = await getDBPool();
        const rows = await db.query('SELECT * FROM customer_booking_history WHERE customer_id = ?', [member_id]);
        return success(res, rows, 'My bookings fetched successfully');
    } catch (err) {
        console.error('Fetch my bookings error:', err);
        return error(res, 'Internal server error', 500);
    }
};