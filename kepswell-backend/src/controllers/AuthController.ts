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

    changePassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { old_password, new_password } = req.body;
            await this.authService.changePassword(req.user!.id, old_password, new_password);
            return res.status(200).json({ success: true, message: 'Password berhasil diubah' });
        } catch (err) {
            next(err);
        }
    };
}
