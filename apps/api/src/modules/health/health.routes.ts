import { Router } from 'express';
import { healthController } from './health.controller.js';

export const healthRouter: Router = Router();

healthRouter.get('/healthz', (req, res) => healthController.liveness(req, res));
healthRouter.get('/health', (req, res) => healthController.liveness(req, res));
healthRouter.get('/readyz', (req, res) => healthController.readiness(req, res));
healthRouter.get('/ready', (req, res) => healthController.readiness(req, res));
