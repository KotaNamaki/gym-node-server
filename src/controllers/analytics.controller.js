import {getDBPool} from '../config/db.js';
import {success, error} from '../utils/response.js';

import cache from '../utils/cache.js';

export const getUserStats = async (req, res) => {
    console.log('[Controller] getUserStats called');
    try {
        const cacheKey = 'user_stats';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'User stats fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const totalUsersRows = await db.query('SELECT COUNT(id) as count FROM user');
        const roleCounts = await db.query('SELECT role, COUNT(id) as count FROM user GROUP BY role');
        
        const result = {
            totalUsers: totalUsersRows[0].count,
            roleDistribution: roleCounts
        };

        cache.set(cacheKey, result, 300); // Cache for 5 minutes
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, result, 'User stats fetched successfully');
    } catch (err) {
        console.error('Analytics error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getBookingStats = async (req, res) => {
    console.log('[Controller] getBookingStats called');
    try {
        const cacheKey = 'booking_stats';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Booking stats fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const statusCounts = await db.query('SELECT status, COUNT(id) as count FROM booking GROUP BY status');
        const totalBookingsRows = await db.query('SELECT COUNT(id) as count FROM booking');
        
        const result = {
            totalBookings: totalBookingsRows[0].count,
            statusDistribution: statusCounts
        };

        cache.set(cacheKey, result, 300); // Cache for 5 minutes
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, result, 'Booking stats fetched successfully');
    } catch (err) {
        console.error('Booking analytics error:', err);
        return error(res, 'Internal server error', 500);
    }
};

export const getSessionStats = async (req, res) => {
    console.log('[Controller] getSessionStats called');
    try {
        const cacheKey = 'session_stats';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return success(res, cachedData, 'Session stats fetched successfully (from cache)');
        }

        const db = await getDBPool();
        const sessionStatsRows = await db.query('SELECT COUNT(id) as total_sessions, status FROM session GROUP BY status');
        
        cache.set(cacheKey, sessionStatsRows, 300); // Cache for 5 minutes
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        return success(res, sessionStatsRows, 'Session stats fetched successfully');
    } catch (err) {
        console.error('Session analytics error:', err);
        return error(res, 'Internal server error', 500);
    }
};
