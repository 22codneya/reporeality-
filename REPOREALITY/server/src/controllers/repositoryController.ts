import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { githubService } from '../services/githubService.js';
import { extractClaims } from '../services/claimExtractor.js';
import {
  RepositoryUrlSchema,
  parseGitHubUrl,
  ExtractClaimsRequestSchema,
  type FileTreeEntry,
  type ManifestInfo,
  type RepositoryInspection,
} from '../validators/schemas.js';

// Manifest patterns to recognize and retrieve content
const MANIFEST_PATTERNS = [
  { pattern: /(?:^|\/)package\.json$/i, type: 'npm' },
  { pattern: /(?:^|\/)requirements\.txt$/i, type: 'pip' },
  { pattern: /(?:^|\/)pyproject\.toml$/i, type: 'poetry/pip' },
  { pattern: /(?:^|\/)Pipfile$/i, type: 'pipenv' },
  { pattern: /(?:^|\/)go\.mod$/i, type: 'gomod' },
  { pattern: /(?:^|\/)Cargo\.toml$/i, type: 'cargo' },
  { pattern: /(?:^|\/)pom\.xml$/i, type: 'maven' },
  { pattern: /(?:^|\/)build\.gradle(?:\.kts)?$/i, type: 'gradle' },
  { pattern: /(?:^|\/)Gemfile$/i, type: 'bundler' },
  { pattern: /(?:^|\/)composer\.json$/i, type: 'composer' },
];

function isTestFile(path: string): boolean {
  return (
    /(?:^|\/)(?:tests?|__tests__|specs?)\//i.test(path) ||
    /\.(?:test|spec)\.[a-zA-Z0-9]+$/i.test(path) ||
    /_test\.[a-zA-Z0-9]+$/i.test(path) ||
    /(?:^|\/)test_[a-zA-Z0-9_]+\.[a-zA-Z0-9]+$/i.test(path)
  );
}

function isConfigFile(path: string): boolean {
  return (
    /(?:^|\/)(?:tsconfig.*\.json|vite\.config\.[a-z]+|webpack\.config\.[a-z]+|rollup\.config\.[a-z]+|next\.config\.[a-z]+|eslint\.config\.[a-z]+|\.eslintrc.*|\.prettierrc.*|Dockerfile|docker-compose.*\.ya?ml|Makefile|CMakeLists\.txt|\.env\.example)$/i.test(
      path
    ) || /(?:^|\/)\.github\/workflows\/.*\.ya?ml$/i.test(path)
  );
}

export async function inspect(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = RepositoryUrlSchema.parse(req.body);
    const { owner, repo } = parseGitHubUrl(url);

    // Fetch repository metadata
    const repository = await githubService.getRepositoryInfo(owner, repo);

    // Fetch README and File Tree in parallel
    const [readme, treeResult] = await Promise.all([
      githubService.getReadme(owner, repo),
      githubService.getFileTree(owner, repo, repository.defaultBranch),
    ]);

    const { entries, truncated: treeTruncated } = treeResult;

    // Detect manifests
    const manifestCandidates: Array<{ path: string; type: string }> = [];
    const testFiles: string[] = [];
    const configFiles: string[] = [];

    for (const entry of entries) {
      if (entry.type === 'blob') {
        // Test file detection
        if (isTestFile(entry.path)) {
          testFiles.push(entry.path);
        }

        // Config file detection
        if (isConfigFile(entry.path)) {
          configFiles.push(entry.path);
        }

        // Manifest file detection
        for (const mp of MANIFEST_PATTERNS) {
          if (mp.pattern.test(entry.path)) {
            manifestCandidates.push({ path: entry.path, type: mp.type });
            break;
          }
        }
      }
    }

    // Fetch manifest contents (limit to top 5 manifests to preserve API rate limit)
    const manifests: ManifestInfo[] = await Promise.all(
      manifestCandidates.slice(0, 5).map(async (candidate) => {
        try {
          const content = await githubService.getFileContent(
            owner,
            repo,
            candidate.path,
            repository.defaultBranch
          );
          // Truncate if exceeds maxFileBytes
          const safeContent = content.length > config.maxFileBytes ? content.slice(0, config.maxFileBytes) : content;
          return {
            path: candidate.path,
            type: candidate.type,
            content: safeContent,
          };
        } catch (err) {
          console.warn(`[repositoryController] Could not fetch manifest ${candidate.path}:`, err);
          return {
            path: candidate.path,
            type: candidate.type,
          };
        }
      })
    );

    const totalBlobs = entries.filter((e: FileTreeEntry) => e.type === 'blob').length;
    const cappedEntries = entries.slice(0, config.maxRepoFiles);

    const inspection: RepositoryInspection = {
      repository,
      readme,
      fileTree: cappedEntries,
      manifests,
      testFiles: testFiles.slice(0, 50),
      configFiles: configFiles.slice(0, 50),
      totalFiles: totalBlobs,
      truncated: treeTruncated || entries.length > config.maxRepoFiles,
    };

    res.status(200).json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    next(error);
  }
}

export async function extractClaimsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { readme, fileTree, manifests } = ExtractClaimsRequestSchema.parse(req.body);
    const claimsResponse = extractClaims(readme, manifests, fileTree);

    res.status(200).json({
      success: true,
      data: claimsResponse,
    });
  } catch (error) {
    next(error);
  }
}

export const repositoryController = {
  inspect,
  extractClaims: extractClaimsHandler,
};

export default repositoryController;
