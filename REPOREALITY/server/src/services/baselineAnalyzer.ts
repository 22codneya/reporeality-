// ============================================================
// RepoReality — Baseline Analyzer
// Deterministic claim analysis without AI
// ============================================================

import type { Claim, ClaimFinding, AuditLabel, ConfidenceLevel } from '../validators/schemas.js';
import type { SourceSnippet } from './codeSnippetService.js';
import type { CodeQualitySignal, SecuritySignal, Recommendation } from '../validators/schemas.js';

// Re-export the schemas we need
import { CodeQualitySignalSchema, SecuritySignalSchema, RecommendationSchema } from '../validators/schemas.js';

interface BaselineInput {
  claim: Claim;
  sourceSnippets: SourceSnippet[];
  testSnippets: SourceSnippet[];
  configSnippets: SourceSnippet[];
  detectedLanguages: string[];
  detectedFrameworks: string[];
}

interface BaselineResult {
  finding: ClaimFinding;
  codeQualitySignals: CodeQualitySignal[];
  securitySignals: SecuritySignal[];
  recommendations: Recommendation[];
}

// Technology/keyword patterns for claim categories
const TECHNOLOGY_PATTERNS: Record<string, RegExp[]> = {
  jwt: [/jsonwebtoken|jwt|jose|jws/i, /sign\s*\(|verify\s*\(/i, /bearer\s*token/i],
  oauth: [/oauth|passport|openid/i, /authorize|authorization.*code/i],
  authentication: [
    /auth(?:entication|enticate)?/i,
    /login|signin|sign[\s-]?in/i,
    /passport|session/i,
    /bcrypt|argon|scrypt|hash.*password/i,
  ],
  authorization: [/rbac|role|permission|policy|guard|authorize/i, /admin|moderator|isAdmin/i],
  database: [
    /prisma|sequelize|typeorm|mongoose|knex|drizzle/i,
    /\.query\s*\(|\.find\s*\(|\.create\s*\(|\.update\s*\(/i,
    /postgres|mysql|mongodb|sqlite|redis/i,
    /CREATE\s+TABLE|INSERT\s+INTO|SELECT\s+/i,
  ],
  rest_api: [
    /\.(get|post|put|delete|patch)\s*\(/i,
    /router\.|app\.(get|post|put|delete)/i,
    /express|fastify|koa|hapi/i,
    /@(Get|Post|Put|Delete|Patch)\s*\(/i,
  ],
  graphql: [/graphql|apollo|type\s+Query|type\s+Mutation/i, /gql`|buildSchema/i],
  websocket: [/socket\.io|ws|websocket|\.on\s*\(['"]connect/i],
  docker: [/FROM\s+\w+|EXPOSE\s+\d+|CMD\s+/i, /docker-compose|services:/i],
  testing: [
    /describe\s*\(|it\s*\(|test\s*\(/i,
    /expect\s*\(|assert\s*\(/i,
    /jest|vitest|mocha|pytest|unittest/i,
    /beforeEach|afterEach|beforeAll/i,
  ],
  ci_cd: [/github.*actions|\.github\/workflows/i, /gitlab-ci|circleci|jenkins|travis/i],
  caching: [/redis|memcached|cache|ttl|\.set\s*\(.*expire/i],
  logging: [/winston|pino|morgan|bunyan|logger\.|console\.log/i],
  react: [/import.*react|useState|useEffect|jsx|tsx/i],
  typescript: [/interface\s+\w+|type\s+\w+\s*=|:\s*string|:\s*number/i],
};

/**
 * Run deterministic baseline analysis for a single claim.
 */
export function analyzeClaimBaseline(input: BaselineInput): BaselineResult {
  const allSnippets = [...input.sourceSnippets, ...input.testSnippets, ...input.configSnippets];
  const allContent = allSnippets.map((s) => s.content).join('\n');

  // Determine which technology patterns match the claim
  const claimLower = input.claim.text.toLowerCase();
  const matchedPatterns = findMatchingPatterns(claimLower);

  // Search for evidence in source snippets
  const evidenceMatches = findEvidence(input.sourceSnippets, matchedPatterns);
  const testMatches = findEvidence(input.testSnippets, matchedPatterns);
  const configMatches = findEvidence(input.configSnippets, matchedPatterns);

  // Determine label
  const { label, confidence, summary } = determineLabel(
    input.claim,
    evidenceMatches,
    testMatches,
    configMatches,
    matchedPatterns
  );

  // Build evidence items
  const evidence = evidenceMatches.slice(0, 5).map((m) => ({
    filePath: m.snippet.filePath,
    startLine: m.lineNumber,
    endLine: Math.min(m.lineNumber + 2, m.snippet.endLine),
    snippet: m.matchedLine,
    snippetPurpose: m.reason,
  }));

  // Implementation signals
  const implementationSignals = evidenceMatches.slice(0, 5).map((m) => ({
    signal: m.patternName,
    filePath: m.snippet.filePath,
    description: m.reason,
  }));

  // Test signals
  const testSignals = testMatches.slice(0, 5).map((m) => ({
    signal: m.patternName,
    filePath: m.snippet.filePath,
    description: m.reason,
  }));

  // Code quality analysis
  const codeQualitySignals = analyzeCodeQuality(input.sourceSnippets);

  // Security analysis
  const securitySignals = analyzeSecuritySignals(allSnippets);

  // Recommendations
  const recommendations = generateRecommendations(
    input.claim,
    label,
    evidenceMatches,
    testMatches,
    input.sourceSnippets
  );

  return {
    finding: {
      claimId: input.claim.id,
      claimText: input.claim.text,
      label,
      summary,
      evidence,
      implementationSignals,
      testSignals,
      limitations: [
        'This is a deterministic baseline analysis without AI semantic understanding',
        'Pattern matching may produce false positives or miss subtle implementations',
        'Code presence does not prove correct runtime behavior',
        testMatches.length === 0 ? 'No relevant test evidence was found' : '',
      ].filter(Boolean),
      recommendedChecks: [
        'Run the application and verify the feature manually',
        testMatches.length === 0 ? 'Add tests for this functionality' : 'Execute existing tests',
        'Review the implementation for edge cases',
      ],
      confidence,
    },
    codeQualitySignals,
    securitySignals,
    recommendations,
  };
}

interface EvidenceMatch {
  snippet: SourceSnippet;
  lineNumber: number;
  matchedLine: string;
  patternName: string;
  reason: string;
}

function findMatchingPatterns(claimText: string): Array<{ name: string; patterns: RegExp[] }> {
  const matched: Array<{ name: string; patterns: RegExp[] }> = [];

  for (const [name, patterns] of Object.entries(TECHNOLOGY_PATTERNS)) {
    // Check if this technology is mentioned in the claim
    if (claimText.includes(name.replace(/_/g, ' ')) || claimText.includes(name.replace(/_/g, '-'))) {
      matched.push({ name, patterns });
    }
    // Also check for partial matches
    else if (
      patterns.some((p) => p.test(claimText))
    ) {
      matched.push({ name, patterns });
    }
  }

  // If no specific patterns matched, use generic code presence patterns
  if (matched.length === 0) {
    // Try to extract key terms from the claim
    const terms = claimText.match(/\b[a-z]{3,}\b/gi) || [];
    const genericPatterns = terms
      .filter((t) => t.length > 3)
      .map((t) => new RegExp(t, 'i'));
    if (genericPatterns.length > 0) {
      matched.push({ name: 'generic', patterns: genericPatterns });
    }
  }

  return matched;
}

function findEvidence(
  snippets: SourceSnippet[],
  patterns: Array<{ name: string; patterns: RegExp[] }>
): EvidenceMatch[] {
  const matches: EvidenceMatch[] = [];

  for (const snippet of snippets) {
    const lines = snippet.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      for (const { name, patterns: regexes } of patterns) {
        for (const regex of regexes) {
          if (regex.test(line)) {
            matches.push({
              snippet,
              lineNumber: snippet.startLine + i,
              matchedLine: line.trim().slice(0, 200),
              patternName: name,
              reason: `Pattern "${name}" matched in ${snippet.filePath}`,
            });
            break; // One match per line per pattern group
          }
        }
      }
    }
  }

  // Deduplicate by file + line
  const seen = new Set<string>();
  return matches.filter((m) => {
    const key = `${m.snippet.filePath}:${m.lineNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function determineLabel(
  claim: Claim,
  sourceMatches: EvidenceMatch[],
  testMatches: EvidenceMatch[],
  configMatches: EvidenceMatch[],
  patterns: Array<{ name: string; patterns: RegExp[] }>
): { label: AuditLabel; confidence: ConfidenceLevel; summary: string } {
  const totalEvidence = sourceMatches.length + configMatches.length;
  const hasTests = testMatches.length > 0;

  if (totalEvidence === 0 && !hasTests) {
    return {
      label: 'NOT_VERIFIED',
      confidence: 'LOW',
      summary: `No source code evidence was found matching the claim "${claim.text}". This does not prove the feature is absent — it may be implemented using patterns not recognized by the baseline analyzer.`,
    };
  }

  if (totalEvidence >= 3 && hasTests) {
    return {
      label: 'IMPLEMENTATION_EVIDENCE_FOUND',
      confidence: 'MEDIUM',
      summary: `Multiple code patterns matching this claim were found across ${new Set(sourceMatches.map((m) => m.snippet.filePath)).size} file(s), with supporting test evidence. Pattern-based detection found ${totalEvidence} matches.`,
    };
  }

  if (totalEvidence >= 2) {
    return {
      label: hasTests ? 'IMPLEMENTATION_EVIDENCE_FOUND' : 'PARTIAL_EVIDENCE',
      confidence: 'MEDIUM',
      summary: `Code patterns matching this claim were found in ${new Set(sourceMatches.map((m) => m.snippet.filePath)).size} file(s). ${hasTests ? 'Test files contain related patterns.' : 'No matching test evidence was found.'} Runtime verification is recommended.`,
    };
  }

  if (totalEvidence === 1) {
    return {
      label: 'PARTIAL_EVIDENCE',
      confidence: 'LOW',
      summary: `Limited evidence found: a single pattern match in ${sourceMatches[0]?.snippet.filePath || configMatches[0]?.snippet.filePath || 'unknown'}. Additional source files may contain relevant implementation.`,
    };
  }

  // Only test matches
  if (hasTests && totalEvidence === 0) {
    return {
      label: 'NEEDS_RUNTIME_CHECK',
      confidence: 'LOW',
      summary: `Test patterns found but no implementation source evidence detected. The implementation may exist in files not inspected, or tests may reference planned functionality.`,
    };
  }

  return {
    label: 'NOT_VERIFIED',
    confidence: 'LOW',
    summary: `Insufficient evidence to verify this claim. Manual review recommended.`,
  };
}

// ---- Code Quality Analysis ----

function analyzeCodeQuality(snippets: SourceSnippet[]): CodeQualitySignal[] {
  const signals: CodeQualitySignal[] = [];

  for (const snippet of snippets) {
    const lines = snippet.content.split('\n');

    // Large functions (>50 lines without breaks)
    let consecutiveLines = 0;
    let functionStart = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (/^(export\s+)?(async\s+)?function\s+|^(export\s+)?const\s+\w+\s*=.*=>/.test(line)) {
        functionStart = i;
        consecutiveLines = 0;
      }
      if (functionStart >= 0) {
        consecutiveLines++;
        if (consecutiveLines > 50) {
          signals.push({
            type: 'large_function',
            description: `Function starting at line ${snippet.startLine + functionStart} appears to be very long (${consecutiveLines}+ lines)`,
            filePath: snippet.filePath,
            startLine: snippet.startLine + functionStart,
            severity: 'warning',
          });
          functionStart = -1;
          consecutiveLines = 0;
        }
      }
      if (line === '}' || line === '') {
        if (functionStart >= 0 && consecutiveLines > 3) {
          // Might be end of function
        }
      }
    }

    // Hard-coded configuration
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d{4}/.test(line) && !/\/\/|#|<!--/.test(line.split(/localhost|127/)[0]!)) {
        signals.push({
          type: 'hardcoded_config',
          description: 'Hard-coded host/port detected. Consider using environment variables.',
          filePath: snippet.filePath,
          startLine: snippet.startLine + i,
          severity: 'info',
        });
      }
    }

    // Missing error handling (try without catch, .then without .catch)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (/\.then\s*\(/.test(line) && !/\.catch\s*\(/.test(snippet.content.slice(snippet.content.indexOf(line)))) {
        signals.push({
          type: 'missing_error_handling',
          description: 'Promise chain without .catch() detected',
          filePath: snippet.filePath,
          startLine: snippet.startLine + i,
          severity: 'warning',
        });
        break; // One per file
      }
    }

    // console.log in non-test files
    if (!snippet.filePath.includes('test') && !snippet.filePath.includes('spec')) {
      for (let i = 0; i < lines.length; i++) {
        if (/console\.(log|debug)\s*\(/.test(lines[i]!)) {
          signals.push({
            type: 'console_log',
            description: 'console.log/debug found in production code. Consider using a proper logger.',
            filePath: snippet.filePath,
            startLine: snippet.startLine + i,
            severity: 'info',
          });
          break;
        }
      }
    }
  }

  return signals.slice(0, 20);
}

// ---- Security Signal Analysis ----

function analyzeSecuritySignals(snippets: SourceSnippet[]): SecuritySignal[] {
  const signals: SecuritySignal[] = [];

  for (const snippet of snippets) {
    const lines = snippet.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Possible hardcoded secrets
      if (/(?:password|secret|api_key|apikey|token)\s*[:=]\s*['"][^'"]{8,}['"]/i.test(line)) {
        if (!/example|sample|test|mock|placeholder|your[_-]?/i.test(line)) {
          signals.push({
            type: 'potential_hardcoded_secret',
            description: 'Possible hard-coded secret or credential detected',
            filePath: snippet.filePath,
            startLine: snippet.startLine + i,
            severity: 'critical',
            recommendation: 'Move secrets to environment variables and add to .gitignore',
          });
        }
      }

      // Unsafe eval
      if (/\beval\s*\(/.test(line)) {
        signals.push({
          type: 'unsafe_eval',
          description: 'Use of eval() detected, which can enable code injection',
          filePath: snippet.filePath,
          startLine: snippet.startLine + i,
          severity: 'critical',
          recommendation: 'Replace eval() with safer alternatives',
        });
      }

      // SQL injection risk (string concatenation in queries)
      if (/(?:query|execute|raw)\s*\(\s*[`'"].*\$\{/.test(line) || /\+\s*['"].*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(line)) {
        signals.push({
          type: 'sql_injection_risk',
          description: 'Possible SQL injection: string interpolation in query detected',
          filePath: snippet.filePath,
          startLine: snippet.startLine + i,
          severity: 'critical',
          recommendation: 'Use parameterized queries or a query builder',
        });
      }

      // Disabled CORS (allow all origins)
      if (/cors\s*\(\s*\)|\*/.test(line) && /cors/i.test(line)) {
        signals.push({
          type: 'open_cors',
          description: 'CORS may be configured to allow all origins',
          filePath: snippet.filePath,
          startLine: snippet.startLine + i,
          severity: 'warning',
          recommendation: 'Restrict CORS to specific trusted origins',
        });
      }

      // Disabled security headers
      if (/helmet\s*\(\s*\{.*disable/i.test(line)) {
        signals.push({
          type: 'disabled_security_headers',
          description: 'Security headers may be partially disabled',
          filePath: snippet.filePath,
          startLine: snippet.startLine + i,
          severity: 'warning',
          recommendation: 'Review Helmet configuration and enable appropriate headers',
        });
      }
    }
  }

  return signals.slice(0, 15);
}

// ---- Recommendations ----

function generateRecommendations(
  claim: Claim,
  label: AuditLabel,
  sourceMatches: EvidenceMatch[],
  testMatches: EvidenceMatch[],
  snippets: SourceSnippet[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (testMatches.length === 0 && sourceMatches.length > 0) {
    recommendations.push({
      observation: `Implementation evidence found for "${claim.text}" but no tests detected`,
      filePath: sourceMatches[0]?.snippet.filePath || '',
      why: 'Untested code has higher risk of regressions and undetected bugs',
      uncertainty: 'Tests may exist in files not inspected by this scan',
      nextStep: 'Add unit tests covering the core functionality',
      priority: 'high',
    });
  }

  if (label === 'NOT_VERIFIED') {
    recommendations.push({
      observation: `Could not find implementation evidence for "${claim.text}"`,
      filePath: '',
      why: 'The feature may be unimplemented, or the implementation may use unfamiliar patterns',
      uncertainty: 'The baseline analyzer has limited pattern recognition. A manual review is needed.',
      nextStep: 'Search the codebase for related functionality and verify implementation',
      priority: 'high',
    });
  }

  if (label === 'PARTIAL_EVIDENCE') {
    recommendations.push({
      observation: `Partial evidence found for "${claim.text}"`,
      filePath: sourceMatches[0]?.snippet.filePath || '',
      why: 'Incomplete implementation could lead to security gaps or runtime failures',
      uncertainty: 'Additional implementation may exist in uninspected files',
      nextStep: 'Verify that all aspects of the claim are fully implemented and tested',
      priority: 'medium',
    });
  }

  return recommendations.slice(0, 5);
}

export default { analyzeClaimBaseline };
