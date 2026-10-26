import { Router } from 'express';
import { config } from '../config.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      gemmaConfigured: Boolean(config.geminiApiKey),
      githubTokenConfigured: Boolean(config.githubToken),
    },
  });
});

export default healthRouter;
