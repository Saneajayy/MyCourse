import { Request, Response, NextFunction } from 'express';
import { uuidv7 } from 'uuidv7';

declare global {
  namespace Express {
    interface Request {
      id: string;
      rawBody?: Buffer;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const existingId = req.headers['x-request-id'];
  const reqId =
    typeof existingId === 'string' && existingId.trim().length > 0 ? existingId : uuidv7();

  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}
