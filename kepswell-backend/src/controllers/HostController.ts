import { Request, Response, NextFunction } from 'express';
import { HostService } from '../services/HostService';

export class HostController {
    private hostService = new HostService();

    getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const isActive = req.query.is_active !== undefined
                ? req.query.is_active === 'true'
                : undefined;
            const hosts = await this.hostService.getAll(isActive);
            res.status(200).json({ success: true, data: hosts });
        } catch (err) {
            next(err);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.getById(Number(req.params.id));
            res.status(200).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.create(req.body);
            res.status(201).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.update(Number(req.params.id), req.body);
            res.status(200).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.hostService.delete(Number(req.params.id));
            res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    toggleStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.toggleStatus(Number(req.params.id));
            res.status(200).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };

    regenerateRegistrationCode = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const host = await this.hostService.regenerateRegistrationCode(Number(req.params.id));
            res.status(200).json({ success: true, data: host });
        } catch (err) {
            next(err);
        }
    };
}
