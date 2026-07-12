import { Request, Response, NextFunction } from 'express';
import { HostService } from '../services/HostService';

export class HostController {
    private hostService = new HostService();

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isActive = req.query.is_active !== undefined
                ? req.query.is_active === 'true'
                : true; // Default to true if not explicitly asked
            const hosts = await this.hostService.getAll(isActive);
            return res.status(200).json({ success: true, data: hosts });
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.findHostById(Number(req.params.id));
            return res.status(200).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.registerNewHost(req.body);
            return res.status(201).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.update(Number(req.params.id), req.body);
            return res.status(200).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.hostService.removeHostData(Number(req.params.id));
            return res.status(200).json({ success: true, message: 'Host berhasil dihapus' });
        } catch (err) {
            next(err);
        }
    };


}
