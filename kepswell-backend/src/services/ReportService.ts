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
        startDate?: string;
        endDate?: string;
        host_id?: number;
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

    async checkDuplicate(hostId: number, gmv: number, sku: number, duration: number, liveDate: string | null) {
        return this.reportRepo.checkDuplicate(hostId, gmv, sku, duration, liveDate);
    }

    async verifyReportData(id: number, status: string, userId?: number) {
        const valid = Object.values(REPORT_STATUS) as string[];
        if (!valid.includes(status)) {
            throw new AppError('Invalid status', 400);
        }

        const report = await this.reportRepo.findById(id);
        if (!report) throw new AppError('Report not found', 404);

        const updated = await this.reportRepo.updateStatus(id, status, userId);


        if (status === REPORT_STATUS.APPROVED || status === REPORT_STATUS.REJECTED) {
            notifyHostStatusUpdate({
                host_id:   report.host_id,
                report_id: report.id,
                status:    status as 'APPROVED' | 'REJECTED',
                gmv:       Number(report.reported_gmv),
                pesanan_sku: Number(report.reported_pesanan_sku),
                duration:  Number(report.live_duration_minutes),
            }).catch(err => console.error('Notifikasi gagal:', err.message));
        }

        return updated;
    }

    async calculateStatistics(filters: { month?: number, year?: number, startDate?: string, endDate?: string }) {
        return this.reportRepo.queryStatisticsData(filters);
    }

    async getAvailableMonths() {
        return this.reportRepo.getAvailableMonths();
    }

    async getDailyTrend(filters: { month?: number, year?: number, startDate?: string, endDate?: string }) {
        return this.reportRepo.getDailyTrend(filters);
    }
}

