import {getDBPool} from '../config/db.js';
import cache from '../utils/cache.js';

export const getAllUsers = async (req, res) => {
    try {
        const db = await getDBPool();
        const { nama, email, _page, _limit, _sort, _order } = req.query;

        const page = parseInt(_page) || 1;
        const limit = parseInt(_limit) || 20;
        const offset = (page - 1) * limit;

        /**
         * FIX: Hapus kolom 'role' dari SELECT dan WHERE karena tabel 'user'
         * sekarang khusus hanya untuk Customer.
         */
        let query = 'SELECT id, nama, email, propinsi, kota, created_at FROM user WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM user WHERE 1=1';
        let params = [];

        if (nama) {
            query += ' AND nama LIKE ?';
            countQuery += ' AND nama LIKE ?';
            params.push(`%${nama}%`);
        }
        if (email) {
            query += ' AND email LIKE ?';
            countQuery += ' AND email LIKE ?';
            params.push(`%${email}%`);
        }

        const allowedSortFields = ['id', 'nama', 'email', 'created_at'];
        const sortField = allowedSortFields.includes(_sort) ? _sort : 'id';
        const sortOrder = _order === 'DESC' ? 'DESC' : 'ASC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        const rows = await db.query(query + ' LIMIT ? OFFSET ?', [...params, limit, offset]);
        const countResult = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;

        res.setHeader('X-Total-Count', total);
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customers' });
    }
};

export const getUserById = async (req, res) => {
    try {
        const {id} = req.params;

        // Proteksi akses: Admin atau pemilik akun saja
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const db = await getDBPool();
        const rows = await db.query(
            'SELECT id, nama, email, propinsi, kota, created_at FROM user WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return res.status(404).json({message: 'Customer not found'});
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching customer data' });
    }
};
export const getUserByEmail = async (req, res) => {
    console.log('[Controller] getUserByEmail called', req.params.email);
    try {
        const {email} = req.params;
        const db = await getDBPool();
        const rows = await db.query('SELECT id, nama, email FROM user WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(`Failed to get email ${req.params.email}:`, error);
        res.status(500).json({ message: 'Error fetching user email.' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { nama, email, propinsi, kota } = req.body;
        const loggedInUser = req.user;

        if (loggedInUser.role !== 'admin' && loggedInUser.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const db = await getDBPool();
        const [existing] = await db.query('SELECT * FROM user WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ message: 'Customer not found' });

        /**
         * FIX: Update tabel 'user' tanpa kolom 'role'.
         */
        await db.query(
            'UPDATE user SET nama = ?, email = ?, propinsi = ?, kota = ? WHERE id = ?',
            [nama || existing.nama, email || existing.email, propinsi || existing.propinsi, kota || existing.kota, id]
        );

        cache.del(`user_${id}`);
        cache.del('all_users');
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating customer' });
    }
};

export const deleteUserId = async (req, res) => {
    try {
        const { id } = req.params;
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin only' });

        const db = await getDBPool();
        // Hapus data customer. Karena DB menggunakan CASCADE,
        // data booking terkait akan otomatis terhapus.[cite: 2, 17]
        const result = await db.query('DELETE FROM user WHERE id = ?', [id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'User not found' });

        cache.del('all_users');
        cache.del(`user_${id}`);
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting customer' });
    }
};
