import type { Request, Response, NextFunction } from 'express';
import { auditOrchestrator } from '../services/auditOrchestrator.js';
import { AnalyzeRequestSchema } from '../validators/schemas.js';

export async function analyze(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validatedBody = AnalyzeRequestSchema.parse(req.body);

    // Filter to selected claims
    const selectedClaims = validatedBody.claims.filter((c) =>
      validatedBody.selectedClaimIds.includes(c.id)
    );

    const report = await auditOrchestrator.runAudit(validatedBody.inspection, selectedClaims);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export const auditController = {
  analyze,
};

export default auditController;
