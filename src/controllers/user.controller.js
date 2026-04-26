import {getDBPool} from '../config/db.js';
import cache from '../utils/cache.js';

export const getAllUsers = async (req, res) => {
    console.log('[Controller] getAllUsers called');
    try {
        const cacheKey = 'all_users';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            console.log('[Cache] Hit for', cacheKey);
            return res.json(cachedData);
        }

        const db = await getDBPool();
        const rows = await db.query('SELECT id, nama, email, role, propinsi, kota, created_at FROM user');
        
        cache.set(cacheKey, rows);
        console.log('[Cache] Miss for', cacheKey, '- Data cached');

        res.json(rows);
    } catch (error) {
        console.error('Failed to get all users:', error);
        res.status(500).json({ message: 'Error fetching users.' });
    }
}

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
        const {id} = req.params;
        const loggedInUserRole = req.user.role;
        if (loggedInUserRole !== 'admin') {
            return res.status(403).json({message: 'Forbidden'});
        }
        const db = await getDBPool();
        const result = await db.query('DELETE FROM user WHERE id = ?', [id]);

        // Invalidate cache
        cache.del('all_users');
        cache.del('all_trainers');
        cache.del(`user_${id}`);
        cache.del(`trainer_${id}`);
        console.log('[Cache] Invalidated for deleted user', id);

        res.json({message: 'User deleted'});
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
