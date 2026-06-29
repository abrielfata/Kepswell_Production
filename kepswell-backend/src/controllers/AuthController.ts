import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
    private authService = new AuthService();

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;
            const result = await this.authService.authenticateUser(email, password);
            return res.status(200).json({ success: true, data: result });
        } catch (err) {
            next(err);
        }
    };

    getMe = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = await this.authService.getMe(req.user!.id);
            return res.status(200).json({ success: true, data: user });
        } catch (err) {
            next(err);
        }
    };
    updateProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { full_name, password } = req.body;
            const updated = await this.authService.updateProfile(req.user!.id, full_name, password);
            return res.status(200).json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    };

    getManagers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const managers = await this.authService.getManagers();
            return res.status(200).json({ success: true, data: managers });
        } catch (err) {
            next(err);
        }
    };

    createManager = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, full_name, password, role } = req.body;
            const newManager = await this.authService.createManager(email, full_name, password, role);
            return res.status(201).json({ success: true, data: newManager });
        } catch (err) {
            next(err);
        }
    };

    deleteManager = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.authService.deleteManager(Number(req.params.id));
            return res.status(200).json({ success: true, message: 'Manager deleted' });
        } catch (err) {
            next(err);
        }
    };
}
