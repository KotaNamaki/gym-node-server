import {getDBPool} from '../config/db.js';

export const getAllUsers = async (req, res) => {
    console.log('[Controller] getAllUsers called');
    try {
        const db = await getDBPool();
        const rows = await db.query('SELECT id, nama, email, role FROM user');
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

        const db = await getDBPool();
        const rows = await db.query('SELECT id, nama, email, role FROM user WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({message: 'User not found'});
        }
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
        if (result.affectedRows === 0) {
            return res.status(404).json({message: 'User not found'});
        }
        res.json({message: 'User deleted'});
    } catch (error) {
        console.error(`Failed to delete user_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error deleting user.' });
    }
}
