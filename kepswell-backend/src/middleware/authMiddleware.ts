import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { JwtPayload } from '../types';

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
        res.status(401).json({ success: false, message: 'No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
};

export const authorizeManager = (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'MANAGER') {
        res.status(403).json({ success: false, message: 'Access denied' });
        return;
    }
    next();
};
