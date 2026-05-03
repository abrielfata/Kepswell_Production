import { query } from '../config/db';
import { Report, HostPerformance } from '../types';

export class ReportRepository {
    async findAll(filters: {
        status?: string;
        month?: number;
        year?: number;
        host_id?: number;
        platform?: string;
        page?: number;
        limit?: number;
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
        if (filters.platform) {
            conditions.push(`r.platform = $${idx++}`);
            params.push(filters.platform);
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
            `SELECT r.*, h.full_name as host_name
             FROM reports r
             JOIN hosts h ON r.host_id = h.id
             ${where}
             ORDER BY r.created_at DESC
             LIMIT $${idx++} OFFSET $${idx++}`,
            [...params, limit, offset]
        );

        return { reports: dataResult.rows, total };
    }

    async findById(id: number): Promise<any | null> {
        const result = await query(
            `SELECT r.*, h.full_name as host_name
             FROM reports r
             JOIN hosts h ON r.host_id = h.id
             WHERE r.id = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    async create(data: {
        host_id: number;
        platform: string;
        reported_gmv: number;
        live_duration_minutes: number;
        screenshot_url?: string;
        ocr_raw_text?: string;
        month: number;
        year: number;
    }): Promise<Report> {
        const result = await query(
            `INSERT INTO reports (
                host_id, platform, reported_gmv, live_duration_minutes,
                screenshot_url, ocr_raw_text, month, year
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING *`,
            [
                data.host_id, data.platform, data.reported_gmv,
                data.live_duration_minutes, data.screenshot_url || null,
                data.ocr_raw_text || null, data.month, data.year
            ]
        );
        return result.rows[0];
    }

    async updateStatus(id: number, status: string, notes?: string): Promise<Report | null> {
        const result = await query(
            `UPDATE reports SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3 RETURNING *`,
            [status, notes || null, id]
        );
        return result.rows[0] || null;
    }

    async getStatistics(month?: number, year?: number): Promise<any> {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (month) { conditions.push(`month = $${idx++}`); params.push(month); }
        if (year)  { conditions.push(`year = $${idx++}`);  params.push(year); }

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

    async getHostPerformance(month?: number, year?: number): Promise<HostPerformance[]> {
        const conditions: string[] = [];
        const params: any[] = [];
        let idx = 1;

        if (month) { conditions.push(`month = $${idx++}`); params.push(month); }
        if (year)  { conditions.push(`year = $${idx++}`);  params.push(year); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await query(
            `SELECT * FROM v_host_performance ${where} ORDER BY total_gmv DESC`,
            params
        );
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
