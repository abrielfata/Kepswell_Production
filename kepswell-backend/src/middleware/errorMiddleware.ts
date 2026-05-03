import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status  = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    console.error(`❌ [${status}] ${message}`);

    res.status(status).json({
        success: false,
        message,
        ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
