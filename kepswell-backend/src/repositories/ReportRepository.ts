import { query } from '../config/db';
import { Report, HostPerformance } from '../types';

export class ReportRepository {
    async findAll(filters: {
        status?: string;
        month?: number;
        year?: number;
        host_id?: number;
        page?: number;
        limit?: number;
        startDate?: string;
        endDate?: string;
    }): Promise<{ reports: any[]; total: number }> {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (filters.status) {
            conditions.push(`r.status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.month) {
            conditions.push(`r.month = $${idx++}`);
            params.push(filters.month);
        }
        if (filters.year) {
            conditions.push(`r.year = $${idx++}`);
            params.push(filters.year);
        }
        if (filters.host_id) {
            conditions.push(`r.host_id = $${idx++}`);
            params.push(filters.host_id);
        }
        if (filters.startDate && filters.endDate) {
            conditions.push(`r.created_at >= $${idx++}`);
            params.push(`${filters.startDate} 00:00:00`);
            conditions.push(`r.created_at <= $${idx++}`);
            params.push(`${filters.endDate} 23:59:59`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const page  = filters.page  || 1;
        const limit = filters.limit || 10;
        const offset = (page - 1) * limit;

        const countResult = await query(
            `SELECT COUNT(*) FROM reports r ${where}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const dataResult = await query(
            `SELECT r.*, h.full_name as host_name,
                    u.full_name as user_name
             FROM reports r
             JOIN hosts h ON r.host_id = h.id
             LEFT JOIN users u ON r.user_id = u.id
             ${where}
             ORDER BY r.created_at DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            [...params, limit, offset]
        );

        return { reports: dataResult.rows, total };
    }

    async findById(id: number): Promise<any | null> {
        const result = await query(
            `SELECT r.*, h.full_name as host_name,
                    u.full_name as user_name
             FROM reports r
             JOIN hosts h ON r.host_id = h.id
             LEFT JOIN users u ON r.user_id = u.id
             WHERE r.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async checkDuplicate(
        hostId: number, 
        gmv: number, 
        pesananSku: number, 
        duration: number, 
        liveDate: string | null
    ): Promise<boolean> {
        let sql = `
            SELECT 1 FROM reports
            WHERE host_id = $1
              AND reported_gmv = $2
              AND reported_pesanan_sku = $3
              AND live_duration_minutes = $4
        `;
        const params: any[] = [hostId, gmv, pesananSku, duration];
        
        if (liveDate) {
            sql += ` AND live_date = $5`;
            params.push(liveDate);
        } else {
            // Jika live_date tidak terbaca, cukup cari duplicate di bulan yang sama untuk berjaga-jaga
            // atau cukup dari 4 parameter di atas
        }
        
        sql += ` LIMIT 1`;
        
        const result = await query(sql, params);
        return (result.rowCount ?? 0) > 0;
    }

    async insertReportRecord(data: {
        host_id: number;
        reported_gmv: number;
        reported_pesanan_sku: number;
        live_duration_minutes: number;
        screenshot_url?: string;
        ocr_raw_text?: string;
        live_date?: string | null;
        month: number;
        year: number;
    }): Promise<Report> {
        const result = await query(
            `INSERT INTO reports (
                host_id, reported_gmv, reported_pesanan_sku, live_duration_minutes,
                screenshot_url, ocr_raw_text, live_date, month, year
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING *`,
            [
                data.host_id, data.reported_gmv, data.reported_pesanan_sku,
                data.live_duration_minutes, data.screenshot_url || null,
                data.ocr_raw_text || null, data.live_date || null, data.month, data.year
            ]
        );
        return result.rows[0];
    }

    async updateStatus(id: number, status: string, userId?: number): Promise<Report | null> {
        const result = await query(
            `UPDATE reports
             SET status = $1, user_id = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [status, userId || null, id]
        );
        return result.rows[0] || null;
    }

    async queryStatisticsData(filters: { month?: number, year?: number, startDate?: string, endDate?: string }): Promise<any> {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (filters.startDate && filters.endDate) {
            conditions.push(`created_at >= $${idx++}`);
            params.push(`${filters.startDate} 00:00:00`);
            conditions.push(`created_at <= $${idx++}`);
            params.push(`${filters.endDate} 23:59:59`);
        } else {
            if (filters.month) { conditions.push(`month = $${idx++}`); params.push(filters.month); }
            if (filters.year)  { conditions.push(`year = $${idx++}`);  params.push(filters.year); }
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await query(
            `SELECT
                COUNT(*) as total_reports,
                COUNT(CASE WHEN status = 'PENDING'  THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
                COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected,
                COALESCE(SUM(CASE WHEN status = 'APPROVED' THEN reported_gmv ELSE 0 END), 0) as total_gmv
             FROM reports ${where}`,
            params
        );
        return result.rows[0];
    }

    async getHostPerformance(filters: { month?: number, year?: number, startDate?: string, endDate?: string }): Promise<HostPerformance[]> {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (filters.startDate && filters.endDate) {
            conditions.push(`r.created_at >= $${idx++}`);
            params.push(`${filters.startDate} 00:00:00`);
            conditions.push(`r.created_at <= $${idx++}`);
            params.push(`${filters.endDate} 23:59:59`);
        } else {
            if (filters.month) { conditions.push(`r.month = $${idx++}`); params.push(filters.month); }
            if (filters.year)  { conditions.push(`r.year = $${idx++}`);  params.push(filters.year); }
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const sql = `
            SELECT 
                h.id AS host_id,
                h.full_name AS host_name,
                COUNT(r.id) AS total_reports,
                COUNT(CASE WHEN r.status = 'APPROVED' THEN 1 END) AS approved_reports,
                COALESCE(SUM(CASE WHEN r.status = 'APPROVED' THEN r.reported_gmv ELSE 0 END), 0) AS total_gmv,
                COALESCE(SUM(CASE WHEN r.status = 'APPROVED' THEN r.reported_pesanan_sku ELSE 0 END), 0) AS total_pesanan_sku,
                COALESCE(SUM(CASE WHEN r.status = 'APPROVED' THEN r.live_duration_minutes ELSE 0 END), 0) AS total_duration_minutes,
                COALESCE(SUM(CASE WHEN r.status = 'APPROVED' THEN 
                    FLOOR(r.live_duration_minutes / 120.0) + 
                    CASE WHEN (r.live_duration_minutes % 120) >= 60 THEN 1 ELSE 0 END 
                ELSE 0 END), 0) AS total_sessions,
                COALESCE(AVG(CASE WHEN r.status = 'APPROVED' THEN r.reported_gmv ELSE NULL END), 0) AS avg_gmv_per_session,
                CASE 
                    WHEN SUM(CASE WHEN r.status = 'APPROVED' THEN r.live_duration_minutes ELSE 0 END) > 0 
                    THEN COALESCE(SUM(CASE WHEN r.status = 'APPROVED' THEN r.reported_gmv ELSE 0 END), 0) / 
                         (SUM(CASE WHEN r.status = 'APPROVED' THEN r.live_duration_minutes ELSE 0 END) / 60.0)
                    ELSE 0 
                END AS gmv_per_hour
            FROM hosts h
            JOIN reports r ON h.id = r.host_id
            ${where}
            GROUP BY h.id, h.full_name
            ORDER BY total_gmv DESC
        `;

        const result = await query(sql, params);
        return result.rows;
    }

    async getAvailableMonths(): Promise<any[]> {
        const result = await query(
            `SELECT DISTINCT month, year,
                TO_CHAR(TO_DATE(year||'-'||month||'-01','YYYY-MM-DD'),'Month YYYY') as display_name,
                COUNT(*) as report_count
             FROM reports
             GROUP BY month, year
             ORDER BY year DESC, month DESC`
        );
        return result.rows;
    }
}
