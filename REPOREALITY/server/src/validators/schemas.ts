// ============================================================
// RepoReality — Server-side Zod Validators & Types
// ============================================================
import { z } from 'zod';

// --- Audit Labels ---
export const AuditLabelSchema = z.enum([
  'IMPLEMENTATION_EVIDENCE_FOUND',
  'PARTIAL_EVIDENCE',
  'NOT_VERIFIED',
  'POTENTIAL_INCONSISTENCY',
  'NEEDS_RUNTIME_CHECK',
]);
export type AuditLabel = z.infer<typeof AuditLabelSchema>;

export const ConfidenceLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

// --- Repository URL Validation ---
export const RepositoryUrlSchema = z.object({
  url: z
    .string()
    .url('Must be a valid URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          if (parsed.hostname !== 'github.com') return false;
          const parts = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').split('/');
          if (parts.length < 2) return false;
          const [owner, repo] = parts;
          if (!owner || !repo) return false;
          // Reject paths with too many segments (e.g. links to files)
          if (parts.length > 2 && !['tree', 'blob'].includes(parts[2]!)) return false;
          return /^[a-zA-Z0-9_.-]+$/.test(owner) && /^[a-zA-Z0-9_.-]+$/.test(repo);
        } catch {
          return false;
        }
      },
      { message: 'Must be a valid GitHub repository URL (https://github.com/owner/repo)' }
    ),
});

export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const parsed = new URL(url);
  const parts = parsed.pathname.replace(/^\//, '').replace(/\/$/, '').replace(/\.git$/, '').split('/');
  return { owner: parts[0]!, repo: parts[1]! };
}

// --- Repository Info ---
export const RepositoryInfoSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  defaultBranch: z.string(),
  languages: z.record(z.number()),
  stars: z.number(),
  forks: z.number(),
  url: z.string().url(),
});
export type RepositoryInfo = z.infer<typeof RepositoryInfoSchema>;

// --- File Tree ---
export const FileTreeEntrySchema = z.object({
  path: z.string(),
  type: z.enum(['blob', 'tree']),
  size: z.number().optional(),
  sha: z.string(),
});
export type FileTreeEntry = z.infer<typeof FileTreeEntrySchema>;

// --- Manifest ---
export const ManifestInfoSchema = z.object({
  path: z.string(),
  type: z.string(),
  content: z.string().optional(),
});
export type ManifestInfo = z.infer<typeof ManifestInfoSchema>;

// --- Repository Inspection ---
export const RepositoryInspectionSchema = z.object({
  repository: RepositoryInfoSchema,
  readme: z.string(),
  fileTree: z.array(FileTreeEntrySchema),
  manifests: z.array(ManifestInfoSchema),
  testFiles: z.array(z.string()),
  configFiles: z.array(z.string()),
  totalFiles: z.number(),
  truncated: z.boolean(),
});
export type RepositoryInspection = z.infer<typeof RepositoryInspectionSchema>;

// --- Claims ---
export const ClaimSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: z.string(),
  selected: z.boolean(),
  source: z.string(),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const ClaimsResponseSchema = z.object({
  claims: z.array(ClaimSchema),
  readmeSummary: z.string(),
  detectedFrameworks: z.array(z.string()),
  detectedLanguages: z.array(z.string()),
});
export type ClaimsResponse = z.infer<typeof ClaimsResponseSchema>;

export const ExtractClaimsRequestSchema = z.object({
  url: z.string().optional(),
  readme: z.string(),
  fileTree: z.array(FileTreeEntrySchema),
  manifests: z.array(ManifestInfoSchema),
});
export type ExtractClaimsRequest = z.infer<typeof ExtractClaimsRequestSchema>;

// --- Evidence Item (AI output) ---
export const EvidenceItemSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().min(1),
  endLine: z.number().int().min(1),
  snippet: z.string().max(2000),
  snippetPurpose: z.string().max(500),
});

export const ImplementationSignalSchema = z.object({
  signal: z.string(),
  filePath: z.string(),
  description: z.string(),
});

export const TestSignalSchema = z.object({
  signal: z.string(),
  filePath: z.string(),
  description: z.string(),
});

// --- Single Claim Finding (AI output schema) ---
export const ClaimFindingSchema = z.object({
  claimId: z.string(),
  claimText: z.string(),
  label: AuditLabelSchema,
  summary: z.string().max(1000),
  evidence: z.array(EvidenceItemSchema).max(10),
  implementationSignals: z.array(ImplementationSignalSchema).max(10),
  testSignals: z.array(TestSignalSchema).max(10),
  limitations: z.array(z.string().max(500)).max(10),
  recommendedChecks: z.array(z.string().max(500)).max(10),
  confidence: ConfidenceLevelSchema,
});
export type ClaimFinding = z.infer<typeof ClaimFindingSchema>;

// --- Multiple findings output schema ---
export const ClaimFindingsOutputSchema = z.object({
  findings: z.array(ClaimFindingSchema).max(15),
});

// --- Code Quality Signal ---
export const CodeQualitySignalSchema = z.object({
  type: z.string(),
  description: z.string(),
  filePath: z.string(),
  startLine: z.number().int().min(1).optional(),
  endLine: z.number().int().min(1).optional(),
  severity: z.enum(['info', 'warning', 'concern']),
});
export type CodeQualitySignal = z.infer<typeof CodeQualitySignalSchema>;

// --- Security Signal ---
export const SecuritySignalSchema = z.object({
  type: z.string(),
  description: z.string(),
  filePath: z.string(),
  startLine: z.number().int().min(1).optional(),
  endLine: z.number().int().min(1).optional(),
  severity: z.enum(['info', 'warning', 'critical']),
  recommendation: z.string(),
});
export type SecuritySignal = z.infer<typeof SecuritySignalSchema>;

// --- Recommendation ---
export const RecommendationSchema = z.object({
  observation: z.string(),
  filePath: z.string(),
  why: z.string(),
  uncertainty: z.string(),
  nextStep: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

// --- Full Audit Report ---
export const AuditReportSchema = z.object({
  id: z.string(),
  repository: RepositoryInfoSchema,
  timestamp: z.string(),
  scanScope: z.object({
    filesInspected: z.number(),
    claimsAnalyzed: z.number(),
    modelCallsMade: z.number(),
    analysisMethod: z.enum(['gemma', 'deterministic', 'hybrid']),
  }),
  findings: z.array(ClaimFindingSchema),
  codeQualitySignals: z.array(CodeQualitySignalSchema),
  securitySignals: z.array(SecuritySignalSchema),
  recommendations: z.array(RecommendationSchema),
  testAnalysis: z.object({
    testFilesFound: z.array(z.string()),
    testFrameworkDetected: z.string().nullable(),
    coverageNotes: z.array(z.string()),
  }),
  limitations: z.array(z.string()),
  disclaimer: z.string(),
});
export type AuditReport = z.infer<typeof AuditReportSchema>;

// --- Analyze Request ---
export const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
  selectedClaimIds: z.array(z.string()).min(1).max(15),
  inspection: RepositoryInspectionSchema,
  claims: z.array(ClaimSchema),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// --- Config ---
export interface AppConfig {
  port: number;
  clientOrigin: string;
  githubApiBaseUrl: string;
  githubToken: string | undefined;
  geminiApiKey: string | undefined;
  gemmaModel: string;
  maxRepoFiles: number;
  maxFileBytes: number;
  maxTotalCodeBytes: number;
  maxClaims: number;
  maxFilesPerClaim: number;
  maxAnalysisCalls: number;
  requestTimeoutMs: number;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env['PORT'] || '5001', 10),
    clientOrigin: process.env['CLIENT_ORIGIN'] || 'http://localhost:5173',
    githubApiBaseUrl: process.env['GITHUB_API_BASE_URL'] || 'https://api.github.com',
    githubToken: process.env['GITHUB_TOKEN'] || undefined,
    geminiApiKey: process.env['GEMINI_API_KEY'] || undefined,
    gemmaModel: process.env['GEMMA_MODEL'] || 'gemma-4-27b-it',
    maxRepoFiles: parseInt(process.env['MAX_REPO_FILES'] || '500', 10),
    maxFileBytes: parseInt(process.env['MAX_FILE_BYTES'] || '50000', 10),
    maxTotalCodeBytes: parseInt(process.env['MAX_TOTAL_CODE_BYTES'] || '250000', 10),
    maxClaims: parseInt(process.env['MAX_CLAIMS'] || '10', 10),
    maxFilesPerClaim: parseInt(process.env['MAX_FILES_PER_CLAIM'] || '8', 10),
    maxAnalysisCalls: parseInt(process.env['MAX_ANALYSIS_CALLS'] || '15', 10),
    requestTimeoutMs: parseInt(process.env['REQUEST_TIMEOUT_MS'] || '20000', 10),
  };
}
