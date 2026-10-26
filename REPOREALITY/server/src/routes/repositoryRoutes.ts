import { Router } from 'express';
import { repositoryController } from '../controllers/repositoryController.js';

export const repositoryRouter = Router();

// POST /api/repository/inspect
repositoryRouter.post('/inspect', repositoryController.inspect);

// POST /api/repository/claims
repositoryRouter.post('/claims', repositoryController.extractClaims);

export default repositoryRouter;
