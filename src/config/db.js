import * as mariadb from 'mariadb';
import dotenv from 'dotenv';

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    connectionLimit: 10
});

const dbCheck = async () => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

export const connectDB = () => dbCheck();

export const getDBPool = () => pool;

export default pool;
