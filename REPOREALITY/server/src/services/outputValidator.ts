// ============================================================
// RepoReality — Output Validator
// Validates AI-generated findings against supplied evidence
// ============================================================

import type { ClaimFinding } from '../validators/schemas.js';
import { ClaimFindingSchema, AuditLabelSchema, ConfidenceLevelSchema } from '../validators/schemas.js';
import type { SourceSnippet } from './codeSnippetService.js';

export interface ValidationResult {
  valid: boolean;
  finding: ClaimFinding;
  corrections: string[];
  warnings: string[];
}

/**
 * Validate a claim finding against the actual evidence that was supplied to the model.
 * Fix recoverable issues, reject fabricated references.
 */
export function validateFinding(
  finding: ClaimFinding,
  suppliedSnippets: SourceSnippet[]
): ValidationResult {
  const corrections: string[] = [];
  const warnings: string[] = [];
  let valid = true;

  const suppliedPaths = new Set(suppliedSnippets.map((s) => s.filePath));
  const pathLineRanges = new Map<string, { min: number; max: number }>();
  for (const s of suppliedSnippets) {
    const existing = pathLineRanges.get(s.filePath);
    if (existing) {
      existing.min = Math.min(existing.min, s.startLine);
      existing.max = Math.max(existing.max, s.endLine);
    } else {
      pathLineRanges.set(s.filePath, { min: s.startLine, max: s.endLine });
    }
  }

  // Validate label
  const labelResult = AuditLabelSchema.safeParse(finding.label);
  if (!labelResult.success) {
    corrections.push(`Invalid label "${finding.label}" corrected to "NOT_VERIFIED"`);
    finding.label = 'NOT_VERIFIED';
  }

  // Validate confidence
  const confResult = ConfidenceLevelSchema.safeParse(finding.confidence);
  if (!confResult.success) {
    corrections.push(`Invalid confidence "${finding.confidence}" corrected to "LOW"`);
    finding.confidence = 'LOW';
  }

  // Validate evidence references
  const validEvidence = [];
  for (const ev of finding.evidence) {
    // Check file path exists in supplied evidence
    if (!suppliedPaths.has(ev.filePath)) {
      corrections.push(`Removed fabricated evidence path: ${ev.filePath}`);
      continue;
    }

    // Check line range validity
    const range = pathLineRanges.get(ev.filePath);
    if (range) {
      if (ev.startLine < range.min || ev.endLine > range.max) {
        warnings.push(
          `Evidence line range ${ev.startLine}-${ev.endLine} for ${ev.filePath} ` +
          `may exceed supplied range ${range.min}-${range.max}`
        );
        // Clamp to valid range
        ev.startLine = Math.max(ev.startLine, range.min);
        ev.endLine = Math.min(ev.endLine, range.max);
      }
    }

    if (ev.startLine > ev.endLine) {
      corrections.push(`Fixed inverted line range in ${ev.filePath}`);
      [ev.startLine, ev.endLine] = [ev.endLine, ev.startLine];
    }

    if (ev.startLine < 1) {
      ev.startLine = 1;
      corrections.push(`Fixed invalid start line in ${ev.filePath}`);
    }

    // Truncate oversized snippets
    if (ev.snippet.length > 2000) {
      ev.snippet = ev.snippet.slice(0, 2000) + '\n// [truncated]';
      corrections.push(`Truncated oversized snippet from ${ev.filePath}`);
    }

    validEvidence.push(ev);
  }
  finding.evidence = validEvidence;

  // Validate implementation signal file paths
  finding.implementationSignals = finding.implementationSignals.filter((s) => {
    if (s.filePath && !suppliedPaths.has(s.filePath)) {
      corrections.push(`Removed implementation signal with unknown path: ${s.filePath}`);
      return false;
    }
    return true;
  });

  // Validate test signal file paths
  finding.testSignals = finding.testSignals.filter((s) => {
    if (s.filePath && !suppliedPaths.has(s.filePath)) {
      corrections.push(`Removed test signal with unknown path: ${s.filePath}`);
      return false;
    }
    return true;
  });

  // Truncate arrays to limits
  if (finding.evidence.length > 10) {
    finding.evidence = finding.evidence.slice(0, 10);
    corrections.push('Truncated evidence array to 10 items');
  }
  if (finding.limitations.length > 10) {
    finding.limitations = finding.limitations.slice(0, 10);
  }
  if (finding.recommendedChecks.length > 10) {
    finding.recommendedChecks = finding.recommendedChecks.slice(0, 10);
  }

  // Validate summary length
  if (finding.summary.length > 1000) {
    finding.summary = finding.summary.slice(0, 997) + '...';
    corrections.push('Truncated oversized summary');
  }

  // If all evidence was stripped but label says found, downgrade
  if (
    finding.evidence.length === 0 &&
    finding.label === 'IMPLEMENTATION_EVIDENCE_FOUND'
  ) {
    finding.label = 'NOT_VERIFIED';
    finding.confidence = 'LOW';
    corrections.push('Downgraded label: no valid evidence remained after validation');
  }

  // Final schema validation
  const fullResult = ClaimFindingSchema.safeParse(finding);
  if (!fullResult.success) {
    valid = false;
    warnings.push(`Schema validation failed: ${fullResult.error.message}`);
  }

  return {
    valid: fullResult.success ?? valid,
    finding,
    corrections,
    warnings,
  };
}

/**
 * Validate an entire array of findings.
 */
export function validateFindings(
  findings: ClaimFinding[],
  suppliedSnippets: SourceSnippet[]
): { findings: ClaimFinding[]; totalCorrections: number; allWarnings: string[] } {
  let totalCorrections = 0;
  const allWarnings: string[] = [];
  const validated: ClaimFinding[] = [];

  for (const finding of findings) {
    const result = validateFinding(finding, suppliedSnippets);
    totalCorrections += result.corrections.length;
    allWarnings.push(...result.warnings);
    validated.push(result.finding);
  }

  return { findings: validated, totalCorrections, allWarnings };
}

export default { validateFinding, validateFindings };
