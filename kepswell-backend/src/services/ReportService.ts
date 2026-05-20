import { ReportRepository } from '../repositories/ReportRepository';
import { notifyHostStatusUpdate } from '../bot/telegramBot';

export class ReportService {
    private reportRepo = new ReportRepository();

    async getAll(filters: {
        status?: string;
        month?: number;
        year?: number;
        host_id?: number;
        platform?: string;
        page?: number;
        limit?: number;
    }) {
        return this.reportRepo.findAll(filters);
    }

    async getById(id: number) {
        const report = await this.reportRepo.findById(id);
        if (!report) throw { status: 404, message: 'Report not found' };
        return report;
    }

    async recordNewReport(data: any) {
        return this.reportRepo.insertReportRecord(data);
    }

    async processReportStatus(id: number, status: string, notes?: string) {
        const valid = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!valid.includes(status)) {
            throw { status: 400, message: 'Invalid status' };
        }

        const report = await this.reportRepo.findById(id);
        if (!report) throw { status: 404, message: 'Report not found' };

        const updated = await this.reportRepo.modifyReportStatus(id, status, notes);


        if (status === 'APPROVED' || status === 'REJECTED') {
            notifyHostStatusUpdate({
                host_id:   report.host_id,
                report_id: report.id,
                status:    status as 'APPROVED' | 'REJECTED',
                gmv:       Number(report.reported_gmv),
                duration:  Number(report.live_duration_minutes),
                platform:  report.platform,
                notes,
            }).catch(err => console.error('Notifikasi gagal:', err.message));
        }

        return updated;
    }

    async calculateStatistics(month?: number, year?: number) {
        return this.reportRepo.queryStatisticsData(month, year);
    }

    async getAvailableMonths() {
        return this.reportRepo.getAvailableMonths();
    }
}

