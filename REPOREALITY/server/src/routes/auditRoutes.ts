import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';

export const auditRouter = Router();

// POST /api/audit/analyze
auditRouter.post('/analyze', auditController.analyze);

export default auditRouter;
