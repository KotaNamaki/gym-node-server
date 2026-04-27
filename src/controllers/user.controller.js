import {getDBPool} from '../config/db.js';
import cache from '../utils/cache.js';

export const getAllUsers = async (req, res) => {
    try {
        const db = await getDBPool();
        const { role, nama, email, _page, _limit, _sort, _order } = req.query;

        const page = parseInt(_page) || 1;
        const limit = parseInt(_limit) || 20;
        const offset = (page - 1) * limit;

        let query = 'SELECT id, nama, email, role, propinsi, kota, created_at FROM user WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) as total FROM user WHERE 1=1';
        let params = [];
        if (role) {
            query += ' AND role = ?';
            countQuery += ' AND role = ?';
            params.push(role);
        }
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

        // Add Sorting
        const sortField = _sort || 'id';
        const sortOrder = _order || 'ASC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        const dataQuery = query + ' LIMIT ? OFFSET ?';
        const dataParams = [...params, limit, offset];
        const rows = await db.query(dataQuery, dataParams);
        const countResult = await db.query(countQuery, params);
        const total = countResult[0]?.total || 0;
        res.setHeader('X-Total-Count', total);
        res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
};

export const getUserById = async (req, res) => {
    console.log('[Controller] getUserById called', req.params.id);
    try {
        const {id} = req.params;

        // BOLA Fix: Only admin or the user themselves can access this
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Forbidden: You can only access your own profile' });
        }

        const cacheKey = `user_${id}`;
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return res.json(cachedData);
        }

        const db = await getDBPool();
        const rows = await db.query('SELECT id, nama, email, role, propinsi, kota, created_at FROM user WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }

        cache.set(cacheKey, rows[0]);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        res.json(rows[0]);
    }
    catch (error) {
        console.error(`Failed to get user_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching user.' });
    }
}

export const getUserByEmail = async (req, res) => {
    console.log('[Controller] getUserByEmail called', req.params.email);
    try {
        const {email} = req.params;
        const db = await getDBPool();
        const rows = await db.query('SELECT id, nama, email, role FROM user WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(`Failed to get email ${req.params.email}:`, error);
        res.status(500).json({ message: 'Error fetching user email.' });
    }
}

export const deleteUserId = async (req, res) => {
    console.log('[Controller] deleteUserId called', req.params.id);
    try {
        const { id } = req.params;
        const loggedInUserRole = req.user.role;

        if (loggedInUserRole !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admin only' });
        }

        // Prevent self-deletion
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const db = await getDBPool();
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // Check if user exists
            const user = await connection.query('SELECT id, email FROM user WHERE id = ?', [id]);
            if (user.length === 0) {
                await connection.rollback();
                return res.status(404).json({ message: 'User not found' });
            }

            // Delete related trainer profile first (if exists)
            const trainerResult = await connection.query('DELETE FROM user WHERE id = ?', [id]);
            if (trainerResult.affectedRows > 0) {
                console.log(`[Delete] Removed trainer profile for user ${id}`);
            }

            // Delete any other related records (sessions, bookings, etc.)
            // await connection.query('DELETE FROM sessions WHERE user_id = ?', [id]);
            await connection.query('DELETE FROM booking WHERE member_id = ?', [id]);

            // Finally delete the user
            const result = await connection.query('DELETE FROM user WHERE id = ?', [id]);

            await connection.commit();

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Invalidate all related cache keys
            const cacheKeys = ['all_users', 'all_trainers', `user_${id}`, `trainer_${id}`];
            cacheKeys.forEach(key => cache.del(key));
            console.log('[Cache] Invalidated for deleted user', id);

            res.json({
                message: 'User deleted successfully',
                details: trainerResult.affectedRows > 0 ? 'Trainer profile also removed' : undefined
            });

        } catch (error) {
            await connection.rollback();
            console.error(`Failed to delete user_id ${req.params.id}:`, error);
        }
    } catch (error) {
        console.error(`Failed to delete user_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error deleting user.' });
    }
}

export const updateUser = async (req, res) => {
    console.log('[Controller] updateUser called', req.params.id);
    try {
        const { id } = req.params;
        const { nama, email, role, propinsi, kota } = req.body;
        const loggedInUser = req.user;

        // Only admin or the user themselves can update
        if (loggedInUser.role !== 'admin' && loggedInUser.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
        }

        const db = await getDBPool();

        // Check if user exists
        const [existing] = await db.query('SELECT * FROM user WHERE id = ?', [id]);
        if (!existing) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Only admin can change roles
        const newRole = loggedInUser.role === 'admin' ? (role || existing.role) : existing.role;

        const updateData = {
            nama: nama || existing.nama,
            email: email || existing.email,
            role: newRole,
            propinsi: propinsi || existing.propinsi,
            kota: kota || existing.kota
        };

        await db.query(
            'UPDATE user SET nama = ?, email = ?, role = ?, propinsi = ?, kota = ? WHERE id = ?',
            [updateData.nama, updateData.email, updateData.role, updateData.propinsi, updateData.kota, id]
        );

        // Invalidate cache
        cache.del('all_users');
        cache.del('all_trainers');
        cache.del(`user_${id}`);
        cache.del(`trainer_${id}`);
        console.log('[Cache] Invalidated for updated user', id);

        res.json({ message: 'User updated successfully', user: { id, ...updateData } });
    } catch (error) {
        console.error(`Failed to update user_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error updating user.' });
    }
}
