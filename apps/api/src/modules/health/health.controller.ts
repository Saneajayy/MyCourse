import { Request, Response } from 'express';
import { healthService } from './health.service.js';

export class HealthController {
  public liveness(_req: Request, res: Response): void {
    const data = healthService.getLiveness();
    res.status(200).json({
      success: true,
      data,
    });
  }

  public async readiness(_req: Request, res: Response): Promise<void> {
    const data = await healthService.getReadiness();
    const statusCode = data.ready ? 200 : 503;

    res.status(statusCode).json({
      success: data.ready,
      data,
    });
  }
}

export const healthController = new HealthController();
