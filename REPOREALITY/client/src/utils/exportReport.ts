import type { AuditReport, ClaimFinding } from '../types';

/**
 * Format label string into human-readable text
 */
function formatLabel(label: string): string {
  switch (label) {
    case 'IMPLEMENTATION_EVIDENCE_FOUND':
      return 'Implementation Evidence Found';
    case 'PARTIAL_EVIDENCE':
      return 'Partial Evidence';
    case 'NOT_VERIFIED':
      return 'Not Verified';
    case 'POTENTIAL_INCONSISTENCY':
      return 'Potential Inconsistency';
    case 'NEEDS_RUNTIME_CHECK':
      return 'Needs Runtime Check';
    default:
      return label.replace(/_/g, ' ');
  }
}

/**
 * Export full Audit Report as well-structured Markdown document
 */
export function exportAsMarkdown(report: AuditReport): string {
  const { repository, scanScope, findings, codeQualitySignals, securitySignals, recommendations, testAnalysis, limitations, disclaimer, timestamp } = report;

  const formattedDate = new Date(timestamp).toUTCString();

  // Summary counts
  const countByLabel: Record<string, number> = {
    IMPLEMENTATION_EVIDENCE_FOUND: 0,
    PARTIAL_EVIDENCE: 0,
    NOT_VERIFIED: 0,
    POTENTIAL_INCONSISTENCY: 0,
    NEEDS_RUNTIME_CHECK: 0,
  };

  for (const f of findings) {
    if (countByLabel[f.label] !== undefined) {
      countByLabel[f.label] = (countByLabel[f.label] ?? 0) + 1;
    }
  }

  const lines: string[] = [];

  // Header
  lines.push(`# RepoReality Audit Report: ${repository.fullName}`);
  lines.push('');
  lines.push(`> **Repository**: [${repository.fullName}](${repository.url})  `);
  lines.push(`> **Scan Date**: ${formattedDate}  `);
  lines.push(`> **Analysis Engine**: Google Gemma (Method: ${scanScope.analysisMethod})  `);
  lines.push(`> **Files Inspected**: ${scanScope.filesInspected} | **Claims Analyzed**: ${scanScope.claimsAnalyzed} | **AI Model Calls**: ${scanScope.modelCallsMade}`);
  lines.push('');

  if (repository.description) {
    lines.push(`**Description**: ${repository.description}`);
    lines.push('');
  }

  // Summary Table
  lines.push('## Executive Summary');
  lines.push('');
  lines.push('| Verdict Status | Count | Percentage |');
  lines.push('|---|:---:|:---:|');
  const totalFindings = findings.length || 1;
  lines.push(`| [PASS] Implementation Evidence Found | ${countByLabel.IMPLEMENTATION_EVIDENCE_FOUND ?? 0} | ${Math.round(((countByLabel.IMPLEMENTATION_EVIDENCE_FOUND ?? 0) / totalFindings) * 100)}% |`);
  lines.push(`| [PARTIAL] Partial Evidence | ${countByLabel.PARTIAL_EVIDENCE ?? 0} | ${Math.round(((countByLabel.PARTIAL_EVIDENCE ?? 0) / totalFindings) * 100)}% |`);
  lines.push(`| [CHECK] Needs Runtime Check | ${countByLabel.NEEDS_RUNTIME_CHECK ?? 0} | ${Math.round(((countByLabel.NEEDS_RUNTIME_CHECK ?? 0) / totalFindings) * 100)}% |`);
  lines.push(`| [UNVERIFIED] Not Verified | ${countByLabel.NOT_VERIFIED ?? 0} | ${Math.round(((countByLabel.NOT_VERIFIED ?? 0) / totalFindings) * 100)}% |`);
  lines.push(`| [INCONSISTENCY] Potential Inconsistency | ${countByLabel.POTENTIAL_INCONSISTENCY ?? 0} | ${Math.round(((countByLabel.POTENTIAL_INCONSISTENCY ?? 0) / totalFindings) * 100)}% |`);
  lines.push('');

  // Findings Index
  lines.push('### Claims Verification Table');
  lines.push('');
  lines.push('| # | Claim | Verdict | Confidence | Evidence Files |');
  lines.push('|---|---|---|:---:|:---:|');
  findings.forEach((f, idx) => {
    const verdict = formatLabel(f.label);
    const evidenceCount = f.evidence.length;
    lines.push(`| ${idx + 1} | ${f.claimText.replace(/\|/g, '\\|')} | **${verdict}** | ${f.confidence} | ${evidenceCount} citation(s) |`);
  });
  lines.push('');

  // Detailed Findings
  lines.push('---');
  lines.push('## Detailed Claim Audits');
  lines.push('');

  findings.forEach((f: ClaimFinding, idx: number) => {
    lines.push(`### Claim ${idx + 1}: "${f.claimText}"`);
    lines.push('');
    lines.push(`- **Verdict**: \`${f.label}\` (${formatLabel(f.label)})`);
    lines.push(`- **Confidence Level**: **${f.confidence}**`);
    lines.push('');
    lines.push(`**Summary**: ${f.summary}`);
    lines.push('');

    // Evidence
    if (f.evidence && f.evidence.length > 0) {
      lines.push('#### Code Citations & Implementation Evidence');
      lines.push('');
      f.evidence.forEach((ev, evIdx) => {
        lines.push(`##### Citation ${evIdx + 1}: \`${ev.filePath}\` (Lines ${ev.startLine}–${ev.endLine})`);
        lines.push(`*Purpose: ${ev.snippetPurpose}*`);
        lines.push('');
        lines.push('```');
        lines.push(ev.snippet.trim());
        lines.push('```');
        lines.push('');
      });
    } else {
      lines.push('*No direct source code citations located for this claim.*');
      lines.push('');
    }

    // Implementation Signals
    if (f.implementationSignals && f.implementationSignals.length > 0) {
      lines.push('#### Implementation Signals');
      f.implementationSignals.forEach((sig) => {
        lines.push(`- **\`${sig.signal}\`** (\`${sig.filePath}\`): ${sig.description}`);
      });
      lines.push('');
    }

    // Test Signals
    if (f.testSignals && f.testSignals.length > 0) {
      lines.push('#### Test Signals');
      f.testSignals.forEach((sig) => {
        lines.push(`- **\`${sig.signal}\`** (\`${sig.filePath}\`): ${sig.description}`);
      });
      lines.push('');
    }

    // Limitations
    if (f.limitations && f.limitations.length > 0) {
      lines.push('#### Scope & Verification Limitations');
      f.limitations.forEach((lim) => {
        lines.push(`- ${lim}`);
      });
      lines.push('');
    }

    // Recommended Checks
    if (f.recommendedChecks && f.recommendedChecks.length > 0) {
      lines.push('#### Recommended Next Checks');
      f.recommendedChecks.forEach((rec) => {
        lines.push(`- [ ] ${rec}`);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  });

  // Code Quality Signals
  if (codeQualitySignals && codeQualitySignals.length > 0) {
    lines.push('## Code Quality Signals');
    lines.push('');
    codeQualitySignals.forEach((q) => {
      const lineRange = q.startLine ? `:${q.startLine}${q.endLine ? `-${q.endLine}` : ''}` : '';
      lines.push(`- **[${q.severity.toUpperCase()}]** \`${q.filePath}${lineRange}\` — **${q.type}**: ${q.description}`);
    });
    lines.push('');
  }

  // Security Signals
  if (securitySignals && securitySignals.length > 0) {
    lines.push('## Security Signals');
    lines.push('');
    securitySignals.forEach((s) => {
      const lineRange = s.startLine ? `:${s.startLine}${s.endLine ? `-${s.endLine}` : ''}` : '';
      lines.push(`- **[${s.severity.toUpperCase()}]** \`${s.filePath}${lineRange}\` — **${s.type}**`);
      lines.push(`  - *Observation*: ${s.description}`);
      lines.push(`  - *Recommendation*: ${s.recommendation}`);
    });
    lines.push('');
  }

  // Test Analysis
  lines.push('## Test Suite Analysis');
  lines.push('');
  lines.push(`- **Detected Test Framework**: ${testAnalysis.testFrameworkDetected || 'None detected'}`);
  lines.push(`- **Identified Test Files**: ${testAnalysis.testFilesFound.length} test files`);
  if (testAnalysis.testFilesFound.length > 0) {
    lines.push('  ```');
    testAnalysis.testFilesFound.slice(0, 20).forEach((tf) => {
      lines.push(`  ${tf}`);
    });
    if (testAnalysis.testFilesFound.length > 20) {
      lines.push(`  ... and ${testAnalysis.testFilesFound.length - 20} more test files`);
    }
    lines.push('  ```');
  }
  if (testAnalysis.coverageNotes && testAnalysis.coverageNotes.length > 0) {
    lines.push('- **Coverage & Test Notes**:');
    testAnalysis.coverageNotes.forEach((note) => {
      lines.push(`  - ${note}`);
    });
  }
  lines.push('');

  // Recommendations
  if (recommendations && recommendations.length > 0) {
    lines.push('## Actionable Recommendations');
    lines.push('');
    recommendations.forEach((r, idx) => {
      lines.push(`### Recommendation ${idx + 1} [Priority: ${r.priority.toUpperCase()}]`);
      lines.push(`- **File / Target**: \`${r.filePath}\``);
      lines.push(`- **Observation**: ${r.observation}`);
      lines.push(`- **Rationale**: ${r.why}`);
      lines.push(`- **Uncertainty / Nuance**: ${r.uncertainty}`);
      lines.push(`- **Next Action Step**: ${r.nextStep}`);
      lines.push('');
    });
  }

  // Limitations
  if (limitations && limitations.length > 0) {
    lines.push('## Analysis Scope & Technical Limitations');
    lines.push('');
    limitations.forEach((l) => {
      lines.push(`- ${l}`);
    });
    lines.push('');
  }

  // Disclaimer
  lines.push('## Disclaimer');
  lines.push('');
  lines.push(disclaimer || 'RepoReality performs static source code analysis only. No code is executed, and findings do not constitute an official security certification or guarantee of software correctness.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Export full Audit Report as formatted JSON string
 */
export function exportAsJson(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}

/**
 * Triggers a browser file download using a temporary anchor element
 */
export function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
