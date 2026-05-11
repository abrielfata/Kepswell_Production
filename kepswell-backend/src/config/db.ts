import { Pool, PoolClient } from 'pg';
import { ENV } from './env';

const pool = new Pool({
    connectionString: ENV.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('connect', () => console.log('✅ Database connected'));
pool.on('error', (err) => {
    console.error('❌ Database error:', err);
    process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

export default pool;
