const { getDbPool}  = require('../config/db.js')
const { sucess, error } = require('../utils/response.js')

const CustomerBookingHistory = async (req, res) => {
    try {
        const db = await getDbPool();
        const rows = await db.query('SELECT * FROM customer_booking_history');
        return sucess(res, rows, 'Customer booking history fetched successfully')
    } catch (err) {
        constole.error('Fetch customer booking history error:', err);
        return error(res, 'Internal server error', 500);
    }
};

const CustomerBookingHistoryId = async (req, res) => {
    try{
        const {id} = req.params;
        const db = await getDbPool();
        const rows = await db.query('SELECT * FROM customer_booking_history WHERE customer_id = ?', [id]);
    }
}