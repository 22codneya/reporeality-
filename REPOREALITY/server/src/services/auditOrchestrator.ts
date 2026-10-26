// ============================================================
// RepoReality — Audit Orchestrator
// Coordinates claim analysis, evidence retrieval, AI inference
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  AuditReport,
  Claim,
  ClaimFinding,
  CodeQualitySignal,
  RepositoryInspection,
  SecuritySignal,
  Recommendation,
  AppConfig,
} from '../validators/schemas.js';
import { GemmaService } from './gemmaService.js';
import { rankFilesForClaim } from './fileRelevanceService.js';
import { extractSnippets, redactSecrets } from './codeSnippetService.js';
import { analyzeClaimBaseline } from './baselineAnalyzer.js';
import { validateFindings } from './outputValidator.js';
import { GitHubService } from './githubService.js';
import type { SourceSnippet } from './codeSnippetService.js';

export class AuditOrchestrator {
  private gemmaService: GemmaService;
  private githubService: GitHubService;
  private config: AppConfig;

  constructor(config: AppConfig) {
    this.config = config;
    this.gemmaService = new GemmaService(config);
    this.githubService = new GitHubService(config);
  }

  /**
   * Run full audit: evidence retrieval → analysis (AI or baseline) → validation → report
   */
  async runAudit(inspection: RepositoryInspection, selectedClaims: Claim[]): Promise<AuditReport> {
    const claimsToAnalyze = selectedClaims.slice(0, this.config.maxClaims);
    const useGemma = this.gemmaService.isConfigured();

    const allFindings: ClaimFinding[] = [];
    const allCodeQuality: CodeQualitySignal[] = [];
    const allSecurity: SecuritySignal[] = [];
    const allRecommendations: Recommendation[] = [];
    const allSnippets: SourceSnippet[] = [];
    let modelCallsMade = 0;

    // Process each claim
    for (const claim of claimsToAnalyze) {
      if (modelCallsMade >= this.config.maxAnalysisCalls) break;

      // 1. Rank relevant files for this claim
      const relevance = rankFilesForClaim(claim.text, inspection.fileTree, this.config.maxFilesPerClaim);

      // 2. Retrieve source snippets
      const sourceSnippets: SourceSnippet[] = [];
      const testSnippets: SourceSnippet[] = [];
      const configSnippets: SourceSnippet[] = [];
      let totalBytes = 0;

      // Fetch relevant source files
      for (const scoredFile of relevance.files) {
        if (totalBytes >= this.config.maxTotalCodeBytes) break;

        try {
          let content = await this.githubService.getFileContent(
            inspection.repository.owner,
            inspection.repository.repo,
            scoredFile.path,
            inspection.repository.defaultBranch
          );

          // Truncate large files
          if (content.length > this.config.maxFileBytes) {
            content = content.slice(0, this.config.maxFileBytes);
          }

          // Redact potential secrets
          content = redactSecrets(content);

          const snippets = extractSnippets(scoredFile.path, content, this.config.maxFileBytes);
          const isTest = scoredFile.path.toLowerCase().includes('test') ||
                         scoredFile.path.toLowerCase().includes('spec');
          const isConfig = /\.(config|yml|yaml|toml|ini|env)/.test(scoredFile.path) ||
                           scoredFile.path.toLowerCase().includes('config');

          for (const snippet of snippets) {
            totalBytes += snippet.content.length;
            if (isTest) testSnippets.push(snippet);
            else if (isConfig) configSnippets.push(snippet);
            else sourceSnippets.push(snippet);
          }
        } catch (error) {
          // Skip files that can't be retrieved
          console.warn(`[Orchestrator] Could not fetch ${scoredFile.path}:`, error instanceof Error ? error.message : 'unknown');
        }
      }

      // Also look for test files related to this claim
      const claimLower = claim.text.toLowerCase();
      const relatedTests = inspection.testFiles
        .filter((tf) => {
          const tfLower = tf.toLowerCase();
          return claim.text.toLowerCase().split(/\s+/)
            .filter(w => w.length > 4)
            .some(w => tfLower.includes(w));
        })
        .slice(0, 3);

      for (const testPath of relatedTests) {
        if (totalBytes >= this.config.maxTotalCodeBytes) break;
        if (testSnippets.some(s => s.filePath === testPath)) continue;

        try {
          let content = await this.githubService.getFileContent(
            inspection.repository.owner,
            inspection.repository.repo,
            testPath,
            inspection.repository.defaultBranch
          );
          content = redactSecrets(content.slice(0, this.config.maxFileBytes));
          const snippets = extractSnippets(testPath, content, this.config.maxFileBytes);
          for (const snippet of snippets) {
            totalBytes += snippet.content.length;
            testSnippets.push(snippet);
          }
        } catch {
          // Skip
        }
      }

      allSnippets.push(...sourceSnippets, ...testSnippets, ...configSnippets);

      // 3. Run analysis (AI or baseline)
      if (useGemma && modelCallsMade < this.config.maxAnalysisCalls) {
        // Run Gemma analysis
        const result = await this.gemmaService.analyzeClaim({
          claim,
          readmeContext: inspection.readme.slice(0, 2000),
          detectedLanguages: Object.keys(inspection.repository.languages),
          detectedFrameworks: [], // Will be filled from claim data
          sourceSnippets,
          testSnippets,
          configSnippets,
        });

        if (result.modelCallMade) modelCallsMade++;

        allFindings.push(result.finding);

        if (result.error) {
          console.warn(`[Orchestrator] Gemma error for ${claim.id}: ${result.error}`);
        }
      } else {
        // Run baseline analysis
        const result = analyzeClaimBaseline({
          claim,
          sourceSnippets,
          testSnippets,
          configSnippets,
          detectedLanguages: Object.keys(inspection.repository.languages),
          detectedFrameworks: [],
        });

        allFindings.push(result.finding);
        allCodeQuality.push(...result.codeQualitySignals);
        allSecurity.push(...result.securitySignals);
        allRecommendations.push(...result.recommendations);
      }
    }

    // 4. Validate all findings
    const validated = validateFindings(allFindings, allSnippets);
    if (validated.totalCorrections > 0) {
      console.log(`[Orchestrator] Applied ${validated.totalCorrections} corrections to findings`);
    }

    // 5. Add structural analysis signals
    const structuralQuality = this.extractStructuralQuality(inspection);
    const structuralSecurity = this.extractStructuralSecurity(inspection);
    const structuralRecommendations = this.generateStructuralRecommendations(inspection, validated.findings);

    // 6. Assemble report
    const report: AuditReport = {
      id: uuidv4(),
      repository: inspection.repository,
      timestamp: new Date().toISOString(),
      scanScope: {
        filesInspected: allSnippets.length,
        claimsAnalyzed: claimsToAnalyze.length,
        modelCallsMade,
        analysisMethod: modelCallsMade > 0 ? (modelCallsMade === claimsToAnalyze.length ? 'gemma' : 'hybrid') : 'deterministic',
      },
      findings: validated.findings,
      codeQualitySignals: [...allCodeQuality, ...structuralQuality].slice(0, 20),
      securitySignals: [...allSecurity, ...structuralSecurity].slice(0, 15),
      recommendations: [...allRecommendations, ...structuralRecommendations].slice(0, 10),
      testAnalysis: this.analyzeTests(inspection),
      limitations: [
        'Static analysis only — no code execution or runtime verification performed',
        modelCallsMade === 0
          ? 'AI-based semantic analysis was not available; results are from deterministic pattern matching only'
          : `AI analysis used ${modelCallsMade} model call(s) via hosted Gemma API`,
        inspection.truncated ? 'Repository file tree was truncated by GitHub API' : '',
        'Source-code presence does not guarantee correct runtime behavior',
        'This is a limited first-pass review, not a comprehensive security audit',
      ].filter(Boolean),
      disclaimer:
        'This report is generated by RepoReality automated analysis. It provides evidence-based assessments, not guarantees of code functionality or security. ' +
        'Selected code from the public repository was sent to Google\'s hosted API for analysis. ' +
        'Findings should be verified through manual review, testing, and runtime validation.',
    };

    return report;
  }

  private extractStructuralQuality(inspection: RepositoryInspection): CodeQualitySignal[] {
    const signals: CodeQualitySignal[] = [];

    if (!inspection.readme || inspection.readme.length < 100) {
      signals.push({
        type: 'documentation',
        description: 'README is missing or very brief. Consider adding usage instructions and architecture details.',
        filePath: 'README.md',
        severity: 'warning',
      });
    }

    if (inspection.testFiles.length === 0) {
      signals.push({
        type: 'testing',
        description: 'No automated test files detected. Add tests to verify implementation claims.',
        filePath: 'tests/',
        severity: 'concern',
      });
    } else {
      signals.push({
        type: 'testing',
        description: `Found ${inspection.testFiles.length} test file(s) in the repository.`,
        filePath: inspection.testFiles[0] || 'tests/',
        severity: 'info',
      });
    }

    const hasCi = inspection.configFiles.some((f) => f.includes('workflow') || f.includes('ci'));
    if (!hasCi) {
      signals.push({
        type: 'ci_cd',
        description: 'No CI/CD workflow configuration found.',
        filePath: '.github/workflows/',
        severity: 'warning',
      });
    }

    return signals;
  }

  private extractStructuralSecurity(inspection: RepositoryInspection): SecuritySignal[] {
    const signals: SecuritySignal[] = [];

    for (const entry of inspection.fileTree) {
      const lowerPath = entry.path.toLowerCase();
      if (
        (lowerPath.endsWith('.env') && !lowerPath.includes('example') && !lowerPath.includes('template')) ||
        lowerPath.includes('id_rsa') ||
        (lowerPath.endsWith('.pem') && !lowerPath.includes('test')) ||
        lowerPath.endsWith('.key')
      ) {
        signals.push({
          type: 'potential_secret_leak',
          description: `Potentially sensitive file committed to repository: ${entry.path}`,
          filePath: entry.path,
          severity: 'critical',
          recommendation: 'Remove from git history and add to .gitignore',
        });
      }
    }

    const hasLockfile = inspection.fileTree.some((entry) => {
      const lower = entry.path.toLowerCase();
      return lower.endsWith('package-lock.json') || lower.endsWith('yarn.lock') ||
             lower.endsWith('pnpm-lock.yaml') || lower.endsWith('cargo.lock');
    });

    if (!hasLockfile && inspection.manifests.length > 0) {
      signals.push({
        type: 'missing_lockfile',
        description: 'No dependency lockfile found. Build reproducibility may be at risk.',
        filePath: inspection.manifests[0]?.path || 'package.json',
        severity: 'warning',
        recommendation: 'Commit a lockfile to pin dependency versions',
      });
    }

    return signals;
  }

  private generateStructuralRecommendations(
    inspection: RepositoryInspection,
    findings: ClaimFinding[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (inspection.testFiles.length === 0) {
      recommendations.push({
        observation: 'No automated tests detected in the repository',
        filePath: 'tests/',
        why: 'Automated tests are critical for verifying README claims and preventing regressions',
        uncertainty: 'Tests may exist under custom directories not matched by standard patterns',
        nextStep: 'Add unit and integration tests appropriate for the project language',
        priority: 'high',
      });
    }

    const unverifiedCount = findings.filter((f) => f.label === 'NOT_VERIFIED').length;
    if (unverifiedCount > 0) {
      recommendations.push({
        observation: `${unverifiedCount} claim(s) could not be verified against the scanned codebase`,
        filePath: 'README.md',
        why: 'README claims without traceable implementation create uncertainty for users and contributors',
        uncertainty: 'Implementation may exist in files not covered by this scan',
        nextStep: 'Align README documentation with the actual codebase, or implement the described features',
        priority: 'medium',
      });
    }

    return recommendations;
  }

  private analyzeTests(inspection: RepositoryInspection): {
    testFilesFound: string[];
    testFrameworkDetected: string | null;
    coverageNotes: string[];
  } {
    let framework: string | null = null;

    for (const manifest of inspection.manifests) {
      const content = manifest.content?.toLowerCase() || '';
      if (content.includes('vitest')) { framework = 'Vitest'; break; }
      if (content.includes('"jest"')) { framework = 'Jest'; break; }
      if (content.includes('mocha')) { framework = 'Mocha'; break; }
      if (content.includes('pytest')) { framework = 'Pytest'; break; }
      if (content.includes('cypress')) { framework = 'Cypress'; break; }
      if (content.includes('playwright')) { framework = 'Playwright'; break; }
    }

    const notes: string[] = [];
    const testCount = inspection.testFiles.length;

    if (testCount === 0) {
      notes.push('No test files identified in the repository.');
    } else {
      notes.push(`Found ${testCount} test file(s).`);
      const ratio = ((testCount / Math.max(inspection.totalFiles, 1)) * 100).toFixed(1);
      notes.push(`Test files represent approximately ${ratio}% of repository files.`);
      notes.push('Note: Test existence does not confirm test passage — tests were not executed.');
    }

    return {
      testFilesFound: inspection.testFiles.slice(0, 50),
      testFrameworkDetected: framework,
      coverageNotes: notes,
    };
  }
}

export default AuditOrchestrator;
