import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env';
import { AppError } from '../utils/AppError';

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let status = 500;
    let message = 'Internal server error';

    if (err instanceof AppError) {
        status = err.statusCode;
        message = err.message;
    } else if (err.status || err.statusCode) {
        status = err.status || err.statusCode;
        message = err.message;
    } else if (err instanceof Error) {
        message = err.message;
    }

    console.error(`❌ [${status}] ${message}`);

    res.status(status).json({
        success: false,
        message,
        ...(ENV.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
