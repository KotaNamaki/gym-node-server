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
// ... (getAllBookings & getBookingById tetap sama)

export const createBooking = async (req, res) => {
    try {
        const { session_id, status = 'Pending' } = req.body;
        const member_id = req.user.id;

        if (!session_id) return error(res, 'session_id is required', 400);

        const db = await getDBPool();

        // 1. Ambil data customer dari tabel 'user' (karena role trainer/admin sudah dipisah)
        const [userRows] = await db.query('SELECT nama FROM user WHERE id = ?', [member_id]);
        if (userRows.length === 0) {
            return error(res, 'Customer not found', 404);
        }
        const member_name = userRows[0].nama;

        // 2. Cek sesi & join ke tabel 'trainer' (Bukan lagi tabel 'user')
        const [sessionRows] = await db.query(
            `SELECT s.*, t.nama as trainer_name
             FROM session s
             JOIN trainer t ON s.trainer_id = t.id
             WHERE s.id = ? AND s.status NOT IN ('cancelled', 'completed')`,
            [session_id]
        );

        if (sessionRows.length === 0) {
            return error(res, 'Session not found or unavailable', 404);
        }

        const session = sessionRows[0];

        // 3. Validasi waktu (Sama seperti sebelumnya)
        if (new Date(session.start_time) < new Date()) {
            return error(res, 'Cannot book a session that has already started', 400);
        }

        // 4. Cek duplikasi booking
        const [existing] = await db.query(
            "SELECT id FROM booking WHERE session_id = ? AND member_id = ? AND status != 'Cancel'",
            [session_id, member_id]
        );
        if (existing.length > 0) return error(res, 'You already booked this session', 400);

        // 5. Insert ke tabel booking
        const [result] = await db.query(
            'INSERT INTO booking (session_id, member_id, status, member_name) VALUES (?, ?, ?, ?)',
            [session_id, member_id, status, member_name]
        );

        // 6. Invalidate Cache
        cache.del(`customer_booking_history_${member_id}`);
        cache.del('all_bookings');

        return success(res, { id: result.insertId, session_title: session.title, trainer_name: session.trainer_name }, 'Booking success', 201);
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['Pending', 'Confirmed', 'Cancel'];

        if (!status || !validStatuses.includes(status)) {
            return error(res, 'Invalid status', 400);
        }

        const db = await getDBPool();
        const [rows] = await db.query(
            `SELECT b.*, s.trainer_id FROM booking b 
             JOIN session s ON b.session_id = s.id WHERE b.id = ?`, [id]
        );

        if (rows.length === 0) return error(res, 'Booking not found', 404);
        const booking = rows[0];

        // Auth Logic: Trainer cek ke session.trainer_id, Customer cek ke booking.member_id
        if (req.user.role === 'customer' && (req.user.id !== booking.member_id || status !== 'Cancel')) {
            return error(res, 'Unauthorized to change status', 403);
        }
        if (req.user.role === 'trainer' && req.user.id !== booking.trainer_id) {
            return error(res, 'Not your session', 403);
        }

        await db.query('UPDATE booking SET status = ? WHERE id = ?', [status, id]);

        cache.del(`customer_booking_history_${booking.member_id}`);
        return success(res, null, 'Status updated');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const getMyBookings = async (req, res) => {
    try {
        const member_id = req.user.id;
        const db = await getDBPool();

        // Join dengan 'trainer' untuk mendapatkan nama pelatih
        const [rows] = await db.query(
            `SELECT b.id as booking_id, b.status, s.title, s.start_time, t.nama as trainer_name
             FROM booking b
             JOIN session s ON b.session_id = s.id
             JOIN trainer t ON s.trainer_id = t.id
             WHERE b.member_id = ? ORDER BY s.start_time DESC`,
            [member_id]
        );

        return success(res, rows, 'Fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};
