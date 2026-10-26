import type {
  Claim,
  ClaimsResponse,
  FileTreeEntry,
  ManifestInfo,
} from '../validators/schemas.js';

// Extension to language mapping
const EXTENSION_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.cxx': 'C++',
  '.cc': 'C++',
  '.c': 'C',
  '.swift': 'Swift',
  '.scala': 'Scala',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.dart': 'Dart',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

// Known framework keywords to match in manifests or text
const FRAMEWORK_KEYWORDS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'React', pattern: /\b(react|react-dom)\b/i },
  { name: 'Next.js', pattern: /\b(next|nextjs)\b/i },
  { name: 'Vue.js', pattern: /\b(vue|vuex|pinia)\b/i },
  { name: 'Angular', pattern: /@angular\b/i },
  { name: 'Svelte', pattern: /\b(svelte|sveltekit)\b/i },
  { name: 'Express', pattern: /\bexpress\b/i },
  { name: 'Fastify', pattern: /\bfastify\b/i },
  { name: 'NestJS', pattern: /@nestjs\b/i },
  { name: 'Tailwind CSS', pattern: /\btailwindcss\b/i },
  { name: 'Vitest', pattern: /\bvitest\b/i },
  { name: 'Jest', pattern: /\bjest\b/i },
  { name: 'Mocha', pattern: /\bmocha\b/i },
  { name: 'Cypress', pattern: /\bcypress\b/i },
  { name: 'Playwright', pattern: /@playwright\b/i },
  { name: 'Prisma', pattern: /\bprisma\b/i },
  { name: 'Drizzle ORM', pattern: /\bdrizzle-orm\b/i },
  { name: 'TypeORM', pattern: /\btypeorm\b/i },
  { name: 'GraphQL', pattern: /\b(graphql|apollo)\b/i },
  { name: 'tRPC', pattern: /@trpc\b/i },
  { name: 'Zod', pattern: /\bzod\b/i },
  { name: 'FastAPI', pattern: /\bfastapi\b/i },
  { name: 'Flask', pattern: /\bflask\b/i },
  { name: 'Django', pattern: /\bdjango\b/i },
  { name: 'Pytest', pattern: /\bpytest\b/i },
  { name: 'SQLAlchemy', pattern: /\bsqlalchemy\b/i },
  { name: 'Pydantic', pattern: /\bpydantic\b/i },
  { name: 'Celery', pattern: /\bcelery\b/i },
  { name: 'Gin', pattern: /gin-gonic\/gin/i },
  { name: 'Fiber', pattern: /gofiber\/fiber/i },
  { name: 'Actix Web', pattern: /\bactix-web\b/i },
  { name: 'Axum', pattern: /\baxum\b/i },
  { name: 'Tokio', pattern: /\btokio\b/i },
  { name: 'Docker', pattern: /\bdocker(file)?\b/i },
  { name: 'Kubernetes', pattern: /\b(k8s|kubernetes)\b/i },
];

function detectLanguages(fileTree: FileTreeEntry[], manifests: ManifestInfo[]): string[] {
  const detected = new Set<string>();

  // Detect from file tree extensions
  for (const entry of fileTree) {
    if (entry.type === 'blob') {
      const dotIndex = entry.path.lastIndexOf('.');
      if (dotIndex !== -1) {
        const ext = entry.path.slice(dotIndex).toLowerCase();
        const lang = EXTENSION_MAP[ext];
        if (lang) {
          detected.add(lang);
        }
      }
    }
  }

  // Detect from manifest file paths
  for (const manifest of manifests) {
    const filename = manifest.path.split('/').pop()?.toLowerCase() || '';
    if (filename === 'package.json') {
      detected.add('JavaScript');
    } else if (
      filename === 'requirements.txt' ||
      filename === 'pyproject.toml' ||
      filename === 'pipfile'
    ) {
      detected.add('Python');
    } else if (filename === 'go.mod') {
      detected.add('Go');
    } else if (filename === 'cargo.toml') {
      detected.add('Rust');
    } else if (filename === 'pom.xml' || filename === 'build.gradle') {
      detected.add('Java');
    } else if (filename === 'gemfile') {
      detected.add('Ruby');
    }
  }

  return Array.from(detected).sort();
}

function detectFrameworks(manifests: ManifestInfo[], readme: string): string[] {
  const frameworks = new Set<string>();

  // Search manifests content
  for (const manifest of manifests) {
    if (manifest.content) {
      for (const fw of FRAMEWORK_KEYWORDS) {
        if (fw.pattern.test(manifest.content)) {
          frameworks.add(fw.name);
        }
      }
    }
  }

  // Also check README for major keywords
  for (const fw of FRAMEWORK_KEYWORDS) {
    if (fw.pattern.test(readme)) {
      frameworks.add(fw.name);
    }
  }

  return Array.from(frameworks).sort();
}

function categorizeClaim(text: string): string {
  const lower = text.toLowerCase();

  if (/\b(test|tests|testing|coverage|mock|spec|assert|unit test|e2e|integration test|vitest|jest|pytest)\b/i.test(lower)) {
    return 'testing';
  }
  if (/\b(auth|authentication|authorization|jwt|oauth|ssl|tls|encrypt|encryption|security|sanitize|xss|csrf|vulnerability)\b/i.test(lower)) {
    return 'security';
  }
  if (/\b(cache|redis|fast|speed|latency|scale|scalability|concurrency|benchmark|performance|async|multithreaded|throughput)\b/i.test(lower)) {
    return 'performance';
  }
  if (/\b(docker|k8s|kubernetes|helm|ci\/cd|pipeline|deploy|deployment|aws|gcp|azure|github actions|terraform|container)\b/i.test(lower)) {
    return 'deployment';
  }
  if (/\b(microservice|monorepo|rest|graphql|grpc|api|mvc|cqrs|architecture|event-driven|modular|pipeline)\b/i.test(lower)) {
    return 'architecture';
  }
  if (/\b(typescript|python|rust|go|javascript|react|vue|angular|svelte|next\.js|express|fastapi|postgres|sqlite|mongodb)\b/i.test(lower)) {
    return 'technology';
  }

  return 'feature';
}

function cleanMarkdownLine(line: string): string {
  return line
    .replace(/^[\s*#-]+/, '') // list bullets or headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links [text](url) -> text
    .replace(/[`*_~]/g, '') // formatting markers
    .replace(/<[^>]+>/g, '') // html tags
    .trim();
}

function extractReadmeSummary(readme: string): string {
  if (!readme.trim()) {
    return 'No README content provided.';
  }

  const lines = readme.split('\n');
  const summaryParagraphs: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Skip empty lines, headers, badges, image links, table dividers
    if (!line || line.startsWith('#') || line.startsWith('!') || line.startsWith('|') || line.startsWith('---')) {
      continue;
    }
    // Skip lines that look like badge links
    if (line.includes('shields.io') || line.includes('badge.svg')) {
      continue;
    }

    const cleaned = cleanMarkdownLine(line);
    if (cleaned.length > 25) {
      summaryParagraphs.push(cleaned);
      if (summaryParagraphs.length >= 2) break;
    }
  }

  return summaryParagraphs.join(' ').slice(0, 300) || 'Repository documentation and codebase overview.';
}

export function extractClaims(
  readme: string,
  manifests: ManifestInfo[],
  fileTree: FileTreeEntry[]
): ClaimsResponse {
  const detectedLanguages = detectLanguages(fileTree, manifests);
  const detectedFrameworks = detectFrameworks(manifests, readme);
  const readmeSummary = extractReadmeSummary(readme);

  const rawClaims: Array<{ text: string; source: string; category?: string }> = [];
  const seenTexts = new Set<string>();

  const addClaim = (text: string, source: string, category?: string) => {
    const trimmed = text.trim();
    // Normalize and check length
    if (trimmed.length < 15 || trimmed.length > 250) return;
    const normalized = trimmed.toLowerCase();
    if (seenTexts.has(normalized)) return;
    seenTexts.add(normalized);
    rawClaims.push({ text: trimmed, source, category });
  };

  // 1. Extract from README sections and patterns
  const lines = readme.split('\n');
  let currentSection = '';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('#')) {
      currentSection = cleanMarkdownLine(trimmed);
      continue;
    }

    // Pattern matching for explicit claim sentences
    const claimPatterns = [
      /(?:built with|powered by|developed with|written in)\s+([A-Za-z0-9_.\s+#/]+)/i,
      /(?:support(?:s)?|supports support for|features|implements|provides)\s+([A-Za-z0-9_.\s+#/,-]{10,})/i,
      /(?:designed to|enables users to|allows you to)\s+([A-Za-z0-9_.\s+#/,-]{10,})/i,
    ];

    for (const pattern of claimPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const cleaned = cleanMarkdownLine(trimmed);
        addClaim(cleaned, `README (${currentSection || 'Overview'})`);
        break;
      }
    }

    // Capture list items in Feature / Architecture / Tech Stack sections
    const isFeatureSection = /feature|highlight|capability|what it does|architecture|tech stack|technologies/i.test(
      currentSection
    );

    if (isFeatureSection && (trimmed.startsWith('-') || trimmed.startsWith('*'))) {
      const cleaned = cleanMarkdownLine(trimmed);
      if (cleaned.length >= 20) {
        addClaim(cleaned, `README (${currentSection})`);
      }
    }
  }

  // 2. Add high-level framework & tech stack claims if fewer than 6 claims found
  for (const fw of detectedFrameworks) {
    if (rawClaims.length >= 15) break;
    addClaim(`Built with and utilizes ${fw} framework in the project stack`, 'Manifest Analysis', 'technology');
  }

  for (const lang of detectedLanguages) {
    if (rawClaims.length >= 15) break;
    addClaim(`Written primarily in ${lang} codebase`, 'Repository Analysis', 'technology');
  }

  // Format into final Claim items
  const claims: Claim[] = rawClaims.slice(0, 15).map((item, index) => ({
    id: `claim-${index + 1}`,
    text: item.text,
    category: item.category || categorizeClaim(item.text),
    selected: index < 5, // Select first 5 claims by default
    source: item.source,
  }));

  return {
    claims,
    readmeSummary,
    detectedFrameworks,
    detectedLanguages,
  };
}

export default extractClaims;
