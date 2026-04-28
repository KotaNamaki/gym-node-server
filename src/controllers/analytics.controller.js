import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

import cache from '../utils/cache.js';
export const getUserStats = async (req, res) => {
    try {
        const cacheKey = 'user_stats';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'User stats fetched successfully (cache)');

        const db = await getDBPool();
        // Menjalankan query secara paralel untuk mempercepat fetch
        const [totalUsersRows, roleCounts] = await Promise.all([
            db.query('SELECT COUNT(id) as count FROM user'),
            db.query('SELECT role, COUNT(id) as count FROM user GROUP BY role')
        ]);

        const result = {
            totalUsers: totalUsersRows[0].count,
            roleDistribution: roleCounts
        };

        cache.set(cacheKey, result, 300);
        return success(res, result, 'User stats fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const getBookingStats = async (req, res) => {
    try {
        const cacheKey = 'booking_stats';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Booking stats fetched successfully (cache)');

        const db = await getDBPool();
        const [statusCounts, totalBookingsRows] = await Promise.all([
            db.query('SELECT status, COUNT(id) as count FROM booking GROUP BY status'),
            db.query('SELECT COUNT(id) as count FROM booking')
        ]);

        const result = {
            totalBookings: totalBookingsRows[0].count,
            statusDistribution: statusCounts
        };

        cache.set(cacheKey, result, 300);
        return success(res, result, 'Booking stats fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

export const getSessionStats = async (req, res) => {
    try {
        const cacheKey = 'session_stats';
        const cachedData = cache.get(cacheKey);
        if (cachedData) return success(res, cachedData, 'Session stats fetched successfully (cache)');

        const db = await getDBPool();
        const sessionStatsRows = await db.query('SELECT COUNT(id) as total_sessions, status FROM session GROUP BY status');

        cache.set(cacheKey, sessionStatsRows, 300);
        return success(res, sessionStatsRows, 'Session stats fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};
