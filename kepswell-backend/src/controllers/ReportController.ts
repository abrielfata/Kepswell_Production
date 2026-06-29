import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/ReportService';
import { AuthService } from '../services/AuthService';
import { RankingService } from '../services/RankingService';

export class ReportController {
    private reportService = new ReportService();
    private rankingService = new RankingService();
    private authService = new AuthService();

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { status, month, year, host_id, platform, page, limit } = req.query;
            const result = await this.reportService.getAll({
                status: status as string,
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                host_id: host_id ? Number(host_id) : undefined,
                platform: platform as string,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 10,
            });
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const report = await this.reportService.getById(Number(req.params.id));
            return res.status(200).json({ success: true, data: report });
        } catch (err) {
            next(err);
        }
    };

    verify = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { status, notes } = req.body;
            const verified_by = req.user?.id;
            const report = await this.reportService.verifyReportData(
                Number(req.params.id), status, notes, verified_by
            );
            res.status(200).json({ success: true, data: report });
        } catch (err) {
            next(err);
        }
    };

    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { month, year } = req.query;
            const stats = await this.reportService.calculateStatistics(
                month ? Number(month) : undefined,
                year ? Number(year) : undefined
            );
            return res.status(200).json({ success: true, data: stats });
        } catch (err) {
            next(err);
        }
    };

    getAvailableMonths = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const months = await this.reportService.getAvailableMonths();
            return res.status(200).json({ success: true, data: months });
        } catch (err) {
            next(err);
        }
    };

    getRanking = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { month, year } = req.query;
            const ranking = await this.rankingService.generateRanking(
                month ? Number(month) : undefined,
                year ? Number(year) : undefined
            );
            return res.status(200).json({ success: true, data: ranking });
        } catch (err) {
            next(err);
        }
    };

    getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { month, year } = req.query;
            const m = month ? Number(month) : undefined;
            const y = year ? Number(year) : undefined;

            const statistics = await this.reportService.calculateStatistics(m, y);
            const ranking = await this.rankingService.generateRanking(m, y);

            return res.status(200).json({ success: true, data: { statistics, ranking } });
        } catch (err) {
            next(err);
        }
    };
}
