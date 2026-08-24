import { query, withTransaction } from '../config/db';
import { Schedule } from '../types';

export class ScheduleRepository {
  /**
   * Mengambil jadwal dalam rentang tanggal tertentu
   */
  async findByDateRange(startDate: string, endDate: string): Promise<Schedule[]> {
    const result = await query(
      `SELECT s.*, h.full_name as host_name 
       FROM schedules s
       JOIN hosts h ON s.host_id = h.id
       WHERE s.schedule_date >= $1 AND s.schedule_date <= $2
       ORDER BY s.schedule_date ASC, s.slot_index ASC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  /**
   * Mencari siapa saja host yang dijadwalkan pada tanggal dan list slot tertentu
   */
  async findByDateAndSlots(date: string, slotIndexes: number[]): Promise<Schedule[]> {
    if (slotIndexes.length === 0) return [];
    
    // Create IN clause dynamically based on array length
    const inClause = slotIndexes.map((_, i) => `$${i + 2}`).join(',');
    const params = [date, ...slotIndexes];

    const result = await query(
      `SELECT s.*, h.full_name as host_name 
       FROM schedules s
       JOIN hosts h ON s.host_id = h.id
       WHERE s.schedule_date = $1 AND s.slot_index IN (${inClause})`,
      params
    );
    return result.rows;
  }

  /**
   * Menghapus semua jadwal pada rentang tanggal tertentu
   */
  async deleteByDateRange(startDate: string, endDate: string, client?: any): Promise<void> {
    const queryFn = client ? client.query.bind(client) : query;
    await queryFn(
      `DELETE FROM schedules WHERE schedule_date >= $1 AND schedule_date <= $2`,
      [startDate, endDate]
    );
  }

  /**
   * Simpan banyak jadwal sekaligus (bulk upsert / replace)
   * Menggunakan transaction agar aman
   */
  async bulkReplaceForDateRange(
    startDate: string, 
    endDate: string, 
    entries: { schedule_date: string; slot_index: number; host_id: number }[]
  ): Promise<void> {
    await withTransaction(async (client) => {
      // 1. Hapus jadwal lama di rentang ini
      await this.deleteByDateRange(startDate, endDate, client);

      // 2. Insert jadwal baru jika ada
      if (entries.length > 0) {
        // Kita batch insert untuk performa
        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        for (const entry of entries) {
          placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
          values.push(entry.host_id, entry.schedule_date, entry.slot_index);
        }

        const sql = `
          INSERT INTO schedules (host_id, schedule_date, slot_index)
          VALUES ${placeholders.join(', ')}
        `;

        await client.query(sql, values);
      }
    });
  }
}
