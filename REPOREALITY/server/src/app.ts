import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/healthRoutes.js';
import { repositoryRouter } from './routes/repositoryRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';

export const app = express();

// Enable CORS from configured client origin
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

// JSON body parser with 5mb limit
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Apply rate limiting to all /api routes
app.use('/api', apiRateLimiter);

// Mount API routes
app.use('/api/health', healthRouter);
app.use('/api/repository', repositoryRouter);
app.use('/api/audit', auditRouter);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized error handling middleware
app.use(errorHandler);

export default app;
