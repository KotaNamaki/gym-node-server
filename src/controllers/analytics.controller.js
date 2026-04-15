import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

export const getUserStats = async (req, res) => {
    try {
        const db = await getDBPool();
        const [totalUsersRows] = await db.query('SELECT COUNT(*) as count FROM user');
        const [roleCounts] = await db.query('SELECT role, COUNT(*) as count FROM user GROUP BY role');
        
        return success(res, {
            totalUsers: totalUsersRows[0].count,
            roleDistribution: roleCounts
        }, 'User stats fetched successfully');
    } catch (err) {
        console.error('Analytics error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getBookingStats = async (req, res) => {
    try {
        const db = await getDBPool();
        const [statusCounts] = await db.query('SELECT status, COUNT(*) as count FROM booking GROUP BY status');
        const [totalBookingsRows] = await db.query('SELECT COUNT(*) as count FROM booking');
        
        return success(res, {
            totalBookings: totalBookingsRows[0].count,
            statusDistribution: statusCounts
        }, 'Booking stats fetched successfully');
    } catch (err) {
        console.error('Booking analytics error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getSessionStats = async (req, res) => {
    try {
        const db = await getDBPool();
        const [sessionStatsRows] = await db.query('SELECT COUNT(*) as total_sessions, status FROM session GROUP BY status');
        
        return success(res, sessionStatsRows, 'Session stats fetched successfully');
    } catch (err) {
        console.error('Session analytics error:', err);
        return error(res, 'Internal server error', 500);
    }
};
