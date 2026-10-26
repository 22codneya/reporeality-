// ============================================================
// RepoReality — File Relevance Service
// Deterministic file selection based on claim keywords
// ============================================================

import type { FileTreeEntry } from '../validators/schemas.js';

interface ScoredFile {
  path: string;
  score: number;
  reasons: string[];
}

interface RelevanceResult {
  files: ScoredFile[];
  totalConsidered: number;
}

// Keyword patterns mapped to claim categories
const KEYWORD_PATTERNS: Record<string, string[]> = {
  authentication: [
    'auth', 'login', 'signin', 'signup', 'register', 'jwt', 'token', 'session',
    'passport', 'oauth', 'credential', 'password', 'bcrypt', 'argon',
  ],
  authorization: [
    'auth', 'role', 'permission', 'rbac', 'acl', 'policy', 'guard', 'middleware',
    'authorize', 'access', 'admin',
  ],
  database: [
    'database', 'db', 'model', 'schema', 'migration', 'seed', 'repository',
    'orm', 'prisma', 'sequelize', 'mongoose', 'typeorm', 'knex', 'sql',
    'postgres', 'mysql', 'mongo', 'redis', 'sqlite',
  ],
  api: [
    'route', 'router', 'controller', 'endpoint', 'handler', 'api',
    'rest', 'graphql', 'grpc', 'middleware', 'request', 'response',
  ],
  testing: [
    'test', 'spec', 'mock', 'fixture', 'jest', 'vitest', 'mocha', 'cypress',
    'playwright', 'e2e', 'integration', 'unit', '__tests__', '__mocks__',
  ],
  security: [
    'security', 'encrypt', 'decrypt', 'hash', 'salt', 'cors', 'csrf',
    'xss', 'sanitize', 'validate', 'helmet', 'rate-limit', 'firewall',
  ],
  deployment: [
    'docker', 'dockerfile', 'compose', 'kubernetes', 'k8s', 'ci', 'cd',
    'deploy', 'build', 'pipeline', 'workflow', 'github/workflows',
  ],
  websocket: [
    'socket', 'ws', 'websocket', 'realtime', 'real-time', 'event', 'emit',
    'broadcast', 'channel', 'pubsub',
  ],
  caching: [
    'cache', 'redis', 'memcached', 'ttl', 'invalidat', 'memoize',
  ],
  logging: [
    'log', 'logger', 'winston', 'pino', 'morgan', 'bunyan', 'monitoring',
    'telemetry', 'metric', 'trace',
  ],
  ml: [
    'model', 'train', 'predict', 'inference', 'tensorflow', 'pytorch', 'ml',
    'ai', 'neural', 'embedding', 'transformer', 'nlp', 'llm',
  ],
};

// Files to skip during analysis
const SKIP_PATTERNS = [
  /node_modules\//,
  /\.git\//,
  /dist\//,
  /build\//,
  /\.next\//,
  /\.nuxt\//,
  /coverage\//,
  /\.cache\//,
  /vendor\//,
  /\.min\.(js|css)$/,
  /bundle\.(js|css)$/,
  /chunk\.[a-f0-9]+\.js$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /Gemfile\.lock$/,
  /Cargo\.lock$/,
  /composer\.lock$/,
  /\.map$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.ico$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/,
  /\.mp[34]$/,
  /\.avi$/,
  /\.mov$/,
  /\.pdf$/,
  /\.zip$/,
  /\.tar/,
  /\.gz$/,
  /\.exe$/,
  /\.dll$/,
  /\.so$/,
  /\.dylib$/,
  /\.pyc$/,
  /\.class$/,
  /\.o$/,
  /\.obj$/,
];

// Source file extensions we care about
const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.java', '.kt', '.go', '.rs',
  '.cs', '.cpp', '.c', '.h', '.hpp',
  '.php', '.swift', '.scala', '.clj',
  '.vue', '.svelte',
  '.yaml', '.yml', '.json', '.toml', '.ini', '.cfg',
  '.xml', '.html', '.css', '.scss', '.less',
  '.sql', '.graphql', '.gql', '.proto',
  '.sh', '.bash', '.ps1', '.bat',
  '.md', '.txt', '.rst',
  '.env.example', '.env.template',
]);

function shouldSkipFile(path: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(path));
}

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot).toLowerCase();
}

function isSourceFile(path: string): boolean {
  const ext = getFileExtension(path);
  if (SOURCE_EXTENSIONS.has(ext)) return true;
  // Special files without extensions
  const basename = path.split('/').pop() || '';
  return ['Dockerfile', 'Makefile', 'Procfile', 'Gemfile', 'Rakefile'].includes(basename);
}

function extractClaimKeywords(claimText: string): string[] {
  const text = claimText.toLowerCase();
  const keywords: string[] = [];

  // Match against known patterns
  for (const [category, patterns] of Object.entries(KEYWORD_PATTERNS)) {
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        keywords.push(...patterns);
        break; // Don't add same category patterns multiple times
      }
    }
  }

  // Extract technology-specific terms
  const techTerms = text.match(
    /\b(react|vue|angular|svelte|express|fastapi|django|flask|spring|rails|laravel|next\.?js|nuxt|gatsby|nest\.?js|prisma|graphql|grpc|docker|kubernetes|aws|gcp|azure|firebase|supabase|vercel|netlify|postgres(?:ql)?|mysql|mongodb|redis|elasticsearch|rabbitmq|kafka|nginx)\b/gi
  );
  if (techTerms) {
    keywords.push(...techTerms.map((t) => t.toLowerCase()));
  }

  // Extract action verbs that help locate files
  const actionTerms = text.match(
    /\b(authenti\w+|authoriz\w+|validat\w+|encrypt\w+|deploy\w+|test\w+|monitor\w+|log\w+|cache\w+|route\w+|migrat\w+|upload\w+|download\w+|export\w+|import\w+|search\w+|filter\w+|sort\w+|pagina\w+)\b/gi
  );
  if (actionTerms) {
    keywords.push(...actionTerms.map((t) => t.toLowerCase()));
  }

  return [...new Set(keywords)];
}

function scoreFile(filePath: string, keywords: string[], claimText: string): ScoredFile {
  const normalizedPath = filePath.toLowerCase();
  const pathSegments = normalizedPath.split('/');
  const filename = pathSegments[pathSegments.length - 1] || '';
  let score = 0;
  const reasons: string[] = [];

  for (const keyword of keywords) {
    // Exact filename match is strongest
    if (filename.includes(keyword)) {
      score += 10;
      reasons.push(`Filename contains "${keyword}"`);
    }
    // Directory match
    else if (normalizedPath.includes(keyword)) {
      score += 5;
      reasons.push(`Path contains "${keyword}"`);
    }
  }

  // Boost test files when claim is about testing
  if (claimText.toLowerCase().includes('test') && isTestFile(filePath)) {
    score += 8;
    reasons.push('Test file relevant to testing claim');
  }

  // Boost config/manifest files for deployment/infrastructure claims
  if (
    (claimText.toLowerCase().includes('docker') || claimText.toLowerCase().includes('deploy')) &&
    isDeploymentFile(filePath)
  ) {
    score += 8;
    reasons.push('Deployment file relevant to claim');
  }

  // Boost entry points and main files
  if (/\/(index|main|app|server|start)\.\w+$/.test(normalizedPath)) {
    score += 2;
    reasons.push('Entry point file');
  }

  // Boost middleware/route/controller files for API claims
  if (/\/(middleware|route|controller|handler|api)\b/.test(normalizedPath)) {
    score += 3;
    reasons.push('API-related file');
  }

  // Slight boost for src/ directory files
  if (normalizedPath.startsWith('src/') || normalizedPath.includes('/src/')) {
    score += 1;
  }

  return { path: filePath, score, reasons };
}

function isTestFile(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.includes('test') ||
    lower.includes('spec') ||
    lower.includes('__tests__') ||
    lower.includes('__mocks__') ||
    /\.(test|spec)\.\w+$/.test(lower)
  );
}

function isDeploymentFile(path: string): boolean {
  const lower = path.toLowerCase();
  const filename = lower.split('/').pop() || '';
  return (
    filename === 'dockerfile' ||
    filename.startsWith('docker-compose') ||
    lower.includes('.github/workflows') ||
    lower.includes('.gitlab-ci') ||
    filename === 'procfile' ||
    filename === 'vercel.json' ||
    filename === 'netlify.toml' ||
    lower.includes('k8s/') ||
    lower.includes('kubernetes/')
  );
}

/**
 * Rank files by relevance to a specific claim.
 * Returns top N files sorted by relevance score.
 */
export function rankFilesForClaim(
  claim: string,
  fileTree: FileTreeEntry[],
  maxFiles: number = 8
): RelevanceResult {
  const blobFiles = fileTree.filter(
    (f) => f.type === 'blob' && !shouldSkipFile(f.path) && isSourceFile(f.path)
  );

  const keywords = extractClaimKeywords(claim);
  const scored = blobFiles
    .map((f) => scoreFile(f.path, keywords, claim))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);

  return {
    files: scored,
    totalConsidered: blobFiles.length,
  };
}

/**
 * Identify manifest/config files in the file tree
 */
export function identifyManifests(fileTree: FileTreeEntry[]): string[] {
  const manifestNames = new Set([
    'package.json',
    'requirements.txt',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'go.sum',
    'pom.xml',
    'build.gradle',
    'build.gradle.kts',
    'composer.json',
    'Gemfile',
    'setup.py',
    'setup.cfg',
    'CMakeLists.txt',
    'Makefile',
  ]);

  return fileTree
    .filter((f) => {
      if (f.type !== 'blob') return false;
      const filename = f.path.split('/').pop() || '';
      return manifestNames.has(filename);
    })
    .map((f) => f.path);
}

/**
 * Identify test files in the file tree
 */
export function identifyTestFiles(fileTree: FileTreeEntry[]): string[] {
  return fileTree
    .filter((f) => f.type === 'blob' && isTestFile(f.path) && isSourceFile(f.path))
    .map((f) => f.path)
    .slice(0, 50); // Cap to avoid returning hundreds
}

/**
 * Identify config files in the file tree
 */
export function identifyConfigFiles(fileTree: FileTreeEntry[]): string[] {
  const configPatterns = [
    /^\.env\.example$/,
    /^\.env\.template$/,
    /^\.eslint/,
    /^\.prettier/,
    /^tsconfig/,
    /^jest\.config/,
    /^vitest\.config/,
    /^webpack\.config/,
    /^vite\.config/,
    /^next\.config/,
    /^nuxt\.config/,
    /^babel\.config/,
    /^\.babelrc/,
    /^tailwind\.config/,
    /^postcss\.config/,
    /^docker-compose/,
    /^Dockerfile/,
    /^nginx\.conf/,
    /^\.github\/workflows\//,
    /^\.gitlab-ci/,
    /^Procfile$/,
    /^vercel\.json$/,
    /^netlify\.toml$/,
    /^\.dockerignore$/,
  ];

  return fileTree
    .filter((f) => {
      if (f.type !== 'blob') return false;
      const filename = f.path.split('/').pop() || '';
      return configPatterns.some((p) => p.test(filename) || p.test(f.path));
    })
    .map((f) => f.path)
    .slice(0, 30);
}

export default {
  rankFilesForClaim,
  identifyManifests,
  identifyTestFiles,
  identifyConfigFiles,
};
