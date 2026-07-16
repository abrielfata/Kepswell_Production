import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/ReportService';
import { RankingService } from '../services/RankingService';

export class ReportController {
    private reportService = new ReportService();
    private rankingService = new RankingService();

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { status, month, year, host_id, page, limit, startDate, endDate } = req.query;
            const result = await this.reportService.getAll({
                status: status as string,
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                startDate: startDate as string,
                endDate: endDate as string,
                host_id: host_id ? Number(host_id) : undefined,
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
            const { status } = req.body;
            const userId = req.user?.id; // ID manajer yang sedang login
            const report = await this.reportService.verifyReportData(
                Number(req.params.id), status, userId
            );
            res.status(200).json({ success: true, data: report });
        } catch (err) {
            next(err);
        }
    };

    getStatistics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { month, year, startDate, endDate } = req.query;
            const stats = await this.reportService.calculateStatistics({
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                startDate: startDate as string,
                endDate: endDate as string
            });
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
            const { month, year, startDate, endDate } = req.query;
            const ranking = await this.rankingService.generateRanking({
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                startDate: startDate as string,
                endDate: endDate as string
            });
            return res.status(200).json({ success: true, data: ranking });
        } catch (err) {
            next(err);
        }
    };

    getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { month, year, startDate, endDate } = req.query;
            const filters = {
                month: month ? Number(month) : undefined,
                year: year ? Number(year) : undefined,
                startDate: startDate as string,
                endDate: endDate as string
            };

            const statistics = await this.reportService.calculateStatistics(filters);
            const ranking = await this.rankingService.generateRanking(filters);
            const dailyTrend = await this.reportService.getDailyTrend(filters);

            return res.status(200).json({ success: true, data: { statistics, ranking, dailyTrend } });
        } catch (err) {
            next(err);
        }
    };
}
