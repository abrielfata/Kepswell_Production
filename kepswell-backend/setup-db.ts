import pool from './src/config/db';

async function setup() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id            SERIAL PRIMARY KEY,
        host_id       INTEGER NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
        schedule_date DATE NOT NULL,
        slot_index    SMALLINT NOT NULL CHECK (slot_index BETWEEN 0 AND 5),
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_schedules_date_slot ON schedules(schedule_date, slot_index);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_schedules_unique_host ON schedules(schedule_date, slot_index, host_id);
    `);

    // Add schedule_status to reports
    await client.query(`
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS schedule_status VARCHAR(20) DEFAULT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ DB setup successful');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Error during setup:', e);
  } finally {
    client.release();
    pool.end();
  }
}

setup();
