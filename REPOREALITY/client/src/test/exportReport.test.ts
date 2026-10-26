import { describe, it, expect } from 'vitest';
import { exportAsMarkdown, exportAsJson } from '../utils/exportReport';
import type { AuditReport } from '../types';

const mockReport: AuditReport = {
  id: 'test-report-1',
  repository: {
    owner: 'testowner',
    repo: 'testrepo',
    fullName: 'testowner/testrepo',
    description: 'A test repository for unit testing',
    defaultBranch: 'main',
    languages: { TypeScript: 12000, JavaScript: 3000 },
    stars: 125,
    forks: 30,
    url: 'https://github.com/testowner/testrepo',
  },
  timestamp: '2026-10-26T12:00:00.000Z',
  scanScope: {
    filesInspected: 15,
    claimsAnalyzed: 2,
    modelCallsMade: 3,
    analysisMethod: 'gemma',
  },
  findings: [
    {
      claimId: 'claim-1',
      claimText: 'Zero dependency fast HTTP routing',
      label: 'IMPLEMENTATION_EVIDENCE_FOUND',
      summary: 'Confirmed via router implementation without external dependencies.',
      confidence: 'HIGH',
      evidence: [
        {
          filePath: 'src/router.ts',
          startLine: 10,
          endLine: 25,
          snippet: 'export class Router {\n  routes = new Map();\n}',
          snippetPurpose: 'Custom router implementation class',
        },
      ],
      implementationSignals: [
        {
          signal: 'AST_CLASS_DECLARATION',
          filePath: 'src/router.ts',
          description: 'Router class found',
        },
      ],
      testSignals: [
        {
          signal: 'TEST_ROUTER_SPEC',
          filePath: 'tests/router.test.ts',
          description: 'Unit tests for router routes',
        },
      ],
      limitations: ['Benchmark not run in actual production cluster'],
      recommendedChecks: ['Run load tests with wrk or autocannon'],
    },
    {
      claimId: 'claim-2',
      claimText: 'Full TypeScript type safety and compile-time schema checking',
      label: 'PARTIAL_EVIDENCE',
      summary: 'TypeScript definitions exist, but several any casts were detected.',
      confidence: 'MEDIUM',
      evidence: [],
      implementationSignals: [],
      testSignals: [],
      limitations: ['Static types inspectable only without tsc compile run'],
      recommendedChecks: ['Run tsc --noEmit in strict mode'],
    },
  ],
  codeQualitySignals: [
    {
      type: 'ANY_CAST',
      description: 'Found explicit any casts in request handler',
      filePath: 'src/handler.ts',
      startLine: 15,
      endLine: 16,
      severity: 'warning',
    },
  ],
  securitySignals: [
    {
      type: 'EVAL_USAGE',
      description: 'Potential dynamic code evaluation detected',
      filePath: 'src/eval.ts',
      startLine: 40,
      severity: 'critical',
      recommendation: 'Refactor to eliminate eval() and use AST parser instead',
    },
  ],
  recommendations: [
    {
      observation: 'Use of loose any types',
      filePath: 'src/handler.ts',
      why: 'Breaks end-to-end type soundness for callers',
      uncertainty: 'May be required for raw Node.js IncomingMessage buffers',
      nextStep: 'Replace any with unknown and type guards',
      priority: 'high',
    },
  ],
  testAnalysis: {
    testFilesFound: ['tests/router.test.ts'],
    testFrameworkDetected: 'Vitest',
    coverageNotes: ['Router test covers basic HTTP methods'],
  },
  limitations: ['Static inspection only. No runtime execution.'],
  disclaimer: 'RepoReality provides static analysis and does not guarantee complete security.',
};

describe('exportReport utility', () => {
  it('exportAsJson produces valid JSON representation of AuditReport', () => {
    const jsonStr = exportAsJson(mockReport);
    expect(jsonStr).toBeTypeOf('string');
    const parsed = JSON.parse(jsonStr);
    expect(parsed.id).toBe('test-report-1');
    expect(parsed.repository.fullName).toBe('testowner/testrepo');
    expect(parsed.findings).toHaveLength(2);
  });

  it('exportAsMarkdown includes all critical sections and metadata', () => {
    const md = exportAsMarkdown(mockReport);
    expect(md).toContain('# RepoReality Audit Report: testowner/testrepo');
    expect(md).toContain('testowner/testrepo');
    expect(md).toContain('Executive Summary');
    expect(md).toContain('Implementation Evidence Found');
    expect(md).toContain('Partial Evidence');
    expect(md).toContain('Zero dependency fast HTTP routing');
    expect(md).toContain('src/router.ts');
    expect(md).toContain('Code Quality Signals');
    expect(md).toContain('Security Signals');
    expect(md).toContain('Test Suite Analysis');
    expect(md).toContain('Actionable Recommendations');
    expect(md).toContain('Disclaimer');
  });
});
