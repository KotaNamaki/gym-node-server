import {getDBPool} from '../config/db.js';

export const getAllTrainers = async (req, res) => {
    console.log('[Controller] getAllTrainers called');
    try {
        const db = await getDBPool();
        const rows = await db.query("SELECT id, nama, email, role, propinsi, kota FROM user WHERE role = 'trainer'");
        res.json(rows);
    } catch (error) {
        console.error('Failed to get all trainers:', error);
        res.status(500).json({ message: 'Error fetching trainers.' });
    }
};

export const getTrainerById = async (req, res) => {
    console.log('[Controller] getTrainerById called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();
        const rows = await db.query("SELECT id, nama, email, role, propinsi, kota FROM user WHERE id = ? AND role = 'trainer'", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(`Failed to get trainer_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching trainer.' });
    }
};

export const getTrainerNameById = async (req, res) => {
    console.log('[Controller] getTrainerNameById called', req.params.id);
    try {
        const { id } = req.params;
        const db = await getDBPool();
        const rows = await db.query("SELECT nama FROM user WHERE id = ? AND role = 'trainer'", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }
        res.json({ id, nama: rows[0].nama });
    } catch (error) {
        console.error(`Failed to get trainer name for id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error fetching trainer name.' });
    }
};

export const updateTrainer = async (req, res) => {
    console.log('[Controller] updateTrainer called', req.params.id);
    try {
        const { id } = req.params;
        const { nama, email, propinsi, kota } = req.body;
        const loggedInUser = req.user;

        // Only admin or the trainer themselves can update
        if (loggedInUser.role !== 'admin' && loggedInUser.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile' });
        }

        const db = await getDBPool();
        
        // Check if trainer exists
        const rows = await db.query("SELECT * FROM user WHERE id = ? AND role = 'trainer'", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Trainer not found' });
        }
        const existing = rows[0];

        const updateData = {
            nama: nama || existing.nama,
            email: email || existing.email,
            propinsi: propinsi || existing.propinsi,
            kota: kota || existing.kota
        };

        await db.query(
            'UPDATE user SET nama = ?, email = ?, propinsi = ?, kota = ? WHERE id = ? AND role = "trainer"',
            [updateData.nama, updateData.email, updateData.propinsi, updateData.kota, id]
        );

        res.json({ message: 'Trainer updated successfully', trainer: { id, ...updateData } });
    } catch (error) {
        console.error(`Failed to update trainer_id ${req.params.id}:`, error);
        res.status(500).json({ message: 'Error updating trainer.' });
    }
};
