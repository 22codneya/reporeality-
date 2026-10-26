// ============================================================
// RepoReality — Language & Framework Detector
// Deterministic detection from file tree and manifests
// ============================================================

import type { FileTreeEntry } from '../validators/schemas.js';

interface DetectionResult {
  languages: string[];
  frameworks: string[];
  testFrameworks: string[];
  buildTools: string[];
}

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.go': 'Go',
  '.rs': 'Rust',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.scala': 'Scala',
  '.clj': 'Clojure',
  '.ex': 'Elixir',
  '.exs': 'Elixir',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.dart': 'Dart',
  '.r': 'R',
  '.R': 'R',
  '.jl': 'Julia',
  '.lua': 'Lua',
  '.hs': 'Haskell',
  '.ml': 'OCaml',
  '.fs': 'F#',
  '.pl': 'Perl',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.sql': 'SQL',
};

const FRAMEWORK_INDICATORS: Record<string, { files: string[]; deps: string[] }> = {
  React: { files: [], deps: ['react', 'react-dom'] },
  'Next.js': { files: ['next.config.js', 'next.config.ts', 'next.config.mjs'], deps: ['next'] },
  Vue: { files: [], deps: ['vue'] },
  Angular: { files: ['angular.json'], deps: ['@angular/core'] },
  Svelte: { files: ['svelte.config.js'], deps: ['svelte'] },
  Express: { files: [], deps: ['express'] },
  Fastify: { files: [], deps: ['fastify'] },
  NestJS: { files: [], deps: ['@nestjs/core'] },
  Django: { files: ['manage.py'], deps: ['django'] },
  Flask: { files: [], deps: ['flask'] },
  FastAPI: { files: [], deps: ['fastapi'] },
  Rails: { files: ['Gemfile'], deps: ['rails'] },
  'Spring Boot': { files: [], deps: ['spring-boot-starter'] },
  Laravel: { files: ['artisan'], deps: ['laravel/framework'] },
  Gin: { files: [], deps: ['github.com/gin-gonic/gin'] },
  Actix: { files: [], deps: ['actix-web'] },
  Prisma: { files: ['prisma/schema.prisma'], deps: ['prisma', '@prisma/client'] },
  Tailwind: { files: ['tailwind.config.js', 'tailwind.config.ts'], deps: ['tailwindcss'] },
  Docker: { files: ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml'], deps: [] },
};

const TEST_FRAMEWORK_DEPS: Record<string, string> = {
  jest: 'Jest',
  vitest: 'Vitest',
  mocha: 'Mocha',
  jasmine: 'Jasmine',
  ava: 'AVA',
  tape: 'Tape',
  cypress: 'Cypress',
  playwright: 'Playwright',
  '@playwright/test': 'Playwright',
  '@testing-library/react': 'Testing Library',
  pytest: 'Pytest',
  unittest: 'unittest',
  rspec: 'RSpec',
  'go test': 'Go Test',
};

const BUILD_TOOL_DEPS: Record<string, string> = {
  webpack: 'Webpack',
  vite: 'Vite',
  rollup: 'Rollup',
  esbuild: 'esbuild',
  parcel: 'Parcel',
  turbo: 'Turborepo',
  nx: 'Nx',
  lerna: 'Lerna',
  gulp: 'Gulp',
  grunt: 'Grunt',
};

/**
 * Detect languages and frameworks from file tree and manifest content.
 */
export function detectLanguagesAndFrameworks(
  fileTree: FileTreeEntry[],
  manifestContents: Array<{ path: string; content: string }>
): DetectionResult {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const testFrameworks = new Set<string>();
  const buildTools = new Set<string>();
  const fileNames = new Set(fileTree.map((f) => f.path));

  // Detect languages from file extensions
  for (const file of fileTree) {
    if (file.type !== 'blob') continue;
    const ext = getExtension(file.path);
    const lang = EXTENSION_TO_LANGUAGE[ext];
    if (lang) languages.add(lang);
  }

  // Detect frameworks from file tree
  for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
    for (const indicatorFile of indicators.files) {
      if (fileNames.has(indicatorFile) || [...fileNames].some((f) => f.endsWith(`/${indicatorFile}`))) {
        frameworks.add(framework);
      }
    }
  }

  // Parse manifest files for dependencies
  for (const manifest of manifestContents) {
    const deps = extractDependencies(manifest.path, manifest.content);

    for (const [framework, indicators] of Object.entries(FRAMEWORK_INDICATORS)) {
      for (const dep of indicators.deps) {
        if (deps.has(dep)) {
          frameworks.add(framework);
        }
      }
    }

    for (const [dep, name] of Object.entries(TEST_FRAMEWORK_DEPS)) {
      if (deps.has(dep)) testFrameworks.add(name);
    }

    for (const [dep, name] of Object.entries(BUILD_TOOL_DEPS)) {
      if (deps.has(dep)) buildTools.add(name);
    }
  }

  return {
    languages: [...languages],
    frameworks: [...frameworks],
    testFrameworks: [...testFrameworks],
    buildTools: [...buildTools],
  };
}

function getExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot).toLowerCase();
}

function extractDependencies(manifestPath: string, content: string): Set<string> {
  const deps = new Set<string>();
  const filename = manifestPath.split('/').pop() || '';

  try {
    if (filename === 'package.json') {
      const pkg = JSON.parse(content);
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (pkg[key] && typeof pkg[key] === 'object') {
          for (const dep of Object.keys(pkg[key])) {
            deps.add(dep);
          }
        }
      }
    } else if (filename === 'requirements.txt') {
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const name = trimmed.split(/[=<>!~\[]/)[0]!.trim();
          if (name) deps.add(name.toLowerCase());
        }
      }
    } else if (filename === 'go.mod') {
      for (const line of content.split('\n')) {
        const match = line.match(/^\s+(\S+)\s+v/);
        if (match) deps.add(match[1]!);
      }
    } else if (filename === 'Cargo.toml') {
      const depSection = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
      if (depSection) {
        for (const line of depSection[1]!.split('\n')) {
          const match = line.match(/^(\w[\w-]*)\s*=/);
          if (match) deps.add(match[1]!);
        }
      }
    } else if (filename === 'composer.json') {
      const composer = JSON.parse(content);
      for (const key of ['require', 'require-dev']) {
        if (composer[key] && typeof composer[key] === 'object') {
          for (const dep of Object.keys(composer[key])) {
            deps.add(dep);
          }
        }
      }
    } else if (filename === 'pyproject.toml') {
      // Simple extraction from pyproject.toml dependencies
      const depsMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (depsMatch) {
        const depsStr = depsMatch[1]!;
        for (const match of depsStr.matchAll(/"([^"]+)"/g)) {
          const name = match[1]!.split(/[=<>!~\[]/)[0]!.trim();
          if (name) deps.add(name.toLowerCase());
        }
      }
    }
  } catch {
    // Skip unparseable manifests
  }

  return deps;
}

export default { detectLanguagesAndFrameworks };
