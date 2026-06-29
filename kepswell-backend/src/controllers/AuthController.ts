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

    getAllAdmins = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const admins = await this.authService.getAllAdmins();
            return res.status(200).json({ success: true, data: admins });
        } catch (err) {
            next(err);
        }
    };

    createAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, full_name, password, role } = req.body;
            const newAdmin = await this.authService.createAdmin(email, full_name, password, role);
            return res.status(201).json({ success: true, data: newAdmin });
        } catch (err) {
            next(err);
        }
    };

    deleteAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.authService.deleteAdmin(Number(req.params.id));
            return res.status(200).json({ success: true, message: 'Admin deleted' });
        } catch (err) {
            next(err);
        }
    };
}
