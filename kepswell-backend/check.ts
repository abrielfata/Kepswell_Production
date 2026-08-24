import pool from './src/config/db';

async function check() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM schedules ORDER BY id DESC LIMIT 10');
    console.log(res.rows);
  } finally {
    client.release();
    pool.end();
  }
}
check();
