import { ReportRepository } from '../repositories/ReportRepository';
import { notifyHostStatusUpdate } from '../bot/telegramBot';
import { AppError } from '../utils/AppError';
import { REPORT_STATUS } from '../config/constants';

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
        if (!report) throw new AppError('Report not found', 404);
        return report;
    }

    async recordNewReport(data: any) {
        return this.reportRepo.insertReportRecord(data);
    }

    async verifyReportData(id: number, status: string, notes?: string) {
        const valid = Object.values(REPORT_STATUS) as string[];
        if (!valid.includes(status)) {
            throw new AppError('Invalid status', 400);
        }

        const report = await this.reportRepo.findById(id);
        if (!report) throw new AppError('Report not found', 404);

        const updated = await this.reportRepo.updateStatus(id, status, notes);


        if (status === REPORT_STATUS.APPROVED || status === REPORT_STATUS.REJECTED) {
            notifyHostStatusUpdate({
                host_id:   report.host_id,
                report_id: report.id,
                status:    status as 'APPROVED' | 'REJECTED',
                gmv:       Number(report.reported_gmv),
                pesanan_sku: Number(report.reported_pesanan_sku),
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

