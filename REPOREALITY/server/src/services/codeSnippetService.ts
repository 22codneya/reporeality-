// ============================================================
// RepoReality — Code Snippet Service
// Extracts bounded source snippets with real line numbers
// ============================================================

import type { AppConfig } from '../validators/schemas.js';

export interface SourceSnippet {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  totalLines: number;
  truncated: boolean;
}

const MAX_SNIPPET_LINES = 80;
const CONTEXT_LINES = 3;

/**
 * Extract meaningful snippets from file content.
 * Returns snippets with accurate line numbers.
 */
export function extractSnippets(
  filePath: string,
  content: string,
  maxBytes: number
): SourceSnippet[] {
  const lines = content.split('\n');
  const totalLines = lines.length;

  // If file is small enough, return whole file
  if (content.length <= maxBytes && lines.length <= MAX_SNIPPET_LINES * 2) {
    return [
      {
        filePath,
        startLine: 1,
        endLine: totalLines,
        content,
        totalLines,
        truncated: false,
      },
    ];
  }

  // For larger files, extract key sections
  const snippets: SourceSnippet[] = [];
  const regions = findInterestingRegions(lines);

  let bytesUsed = 0;

  for (const region of regions) {
    if (bytesUsed >= maxBytes) break;

    const start = Math.max(0, region.start - CONTEXT_LINES);
    const end = Math.min(lines.length - 1, region.end + CONTEXT_LINES);
    const snippetLines = lines.slice(start, end + 1);
    const snippetContent = snippetLines.join('\n');

    if (bytesUsed + snippetContent.length > maxBytes) {
      // Truncate to fit
      const remaining = maxBytes - bytesUsed;
      const truncatedContent = snippetContent.slice(0, remaining);
      const truncatedLineCount = truncatedContent.split('\n').length;
      snippets.push({
        filePath,
        startLine: start + 1, // 1-indexed
        endLine: start + truncatedLineCount,
        content: truncatedContent,
        totalLines,
        truncated: true,
      });
      break;
    }

    snippets.push({
      filePath,
      startLine: start + 1,
      endLine: end + 1,
      content: snippetContent,
      totalLines,
      truncated: false,
    });

    bytesUsed += snippetContent.length;
  }

  // If no interesting regions found, take the first N lines
  if (snippets.length === 0) {
    const maxLines = Math.min(MAX_SNIPPET_LINES, totalLines);
    const snippetContent = lines.slice(0, maxLines).join('\n').slice(0, maxBytes);
    snippets.push({
      filePath,
      startLine: 1,
      endLine: maxLines,
      content: snippetContent,
      totalLines,
      truncated: maxLines < totalLines,
    });
  }

  return snippets;
}

interface Region {
  start: number;
  end: number;
  priority: number;
}

/**
 * Find interesting code regions (imports, exports, classes, functions, config blocks)
 */
function findInterestingRegions(lines: string[]): Region[] {
  const regions: Region[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Import/require block at top
    if (
      i < 30 &&
      (trimmed.startsWith('import ') ||
        trimmed.startsWith('from ') ||
        trimmed.startsWith('const ') ||
        trimmed.startsWith('require('))
    ) {
      const start = i;
      while (
        i < lines.length &&
        i < start + 30 &&
        (lines[i]!.trim().startsWith('import ') ||
          lines[i]!.trim().startsWith('from ') ||
          lines[i]!.trim().startsWith('const ') ||
          lines[i]!.trim().startsWith('require(') ||
          lines[i]!.trim() === '')
      ) {
        i++;
      }
      regions.push({ start, end: i - 1, priority: 3 });
      continue;
    }

    // Function/class/interface definitions
    if (
      /^(export\s+)?(default\s+)?(async\s+)?function\s+/.test(trimmed) ||
      /^(export\s+)?(default\s+)?class\s+/.test(trimmed) ||
      /^(export\s+)?interface\s+/.test(trimmed) ||
      /^(export\s+)?type\s+/.test(trimmed) ||
      /^(export\s+)?const\s+\w+\s*=\s*(async\s+)?\(/.test(trimmed) ||
      /^(export\s+)?const\s+\w+\s*=\s*\{/.test(trimmed) ||
      /^def\s+/.test(trimmed) ||
      /^class\s+/.test(trimmed) ||
      /^(pub\s+)?fn\s+/.test(trimmed) ||
      /^(public|private|protected)\s+(static\s+)?/.test(trimmed)
    ) {
      const start = i;
      let braceDepth = 0;
      let foundOpen = false;

      while (i < lines.length && i < start + MAX_SNIPPET_LINES) {
        const l = lines[i]!;
        for (const ch of l) {
          if (ch === '{' || ch === '(') {
            braceDepth++;
            foundOpen = true;
          }
          if (ch === '}' || ch === ')') {
            braceDepth--;
          }
        }
        i++;
        if (foundOpen && braceDepth <= 0) break;
        // Python: indentation-based
        if (
          foundOpen === false &&
          i > start + 1 &&
          lines[i]?.trim() !== '' &&
          !lines[i]?.startsWith(' ') &&
          !lines[i]?.startsWith('\t')
        ) {
          break;
        }
      }
      regions.push({ start, end: i - 1, priority: 8 });
      continue;
    }

    // Route definitions (Express, FastAPI, etc.)
    if (
      /\.(get|post|put|delete|patch|use|route)\s*\(/.test(trimmed) ||
      /^@(app|router)\.(get|post|put|delete|patch)/.test(trimmed) ||
      /^router\.\w+\s*\(/.test(trimmed)
    ) {
      const start = i;
      let depth = 0;
      let opened = false;
      while (i < lines.length && i < start + 30) {
        for (const ch of lines[i]!) {
          if (ch === '(' || ch === '{') {
            depth++;
            opened = true;
          }
          if (ch === ')' || ch === '}') depth--;
        }
        i++;
        if (opened && depth <= 0) break;
      }
      regions.push({ start, end: i - 1, priority: 7 });
      continue;
    }

    // Export statements
    if (trimmed.startsWith('export ') || trimmed.startsWith('module.exports')) {
      const start = i;
      i++;
      while (i < lines.length && i < start + 10 && lines[i]?.trim() !== '') {
        i++;
      }
      regions.push({ start, end: i - 1, priority: 5 });
      continue;
    }

    i++;
  }

  // Sort by priority (higher first), then by position
  return regions.sort((a, b) => b.priority - a.priority || a.start - b.start);
}

/**
 * Redact potential secrets from source content.
 * Best-effort pattern matching — not guaranteed to catch everything.
 */
export function redactSecrets(content: string): string {
  // Common secret patterns
  const patterns = [
    // API keys and tokens with common prefixes
    /(?<prefix>(?:api[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token|secret[_-]?key|private[_-]?key|password|passwd|credentials?)\s*[:=]\s*)(?<value>['"`][^'"`\n]{8,}['"`])/gi,
    // AWS keys
    /(?<awsKey>AKIA[0-9A-Z]{16})/g,
    // Generic long hex/base64 strings that look like secrets (after = or :)
    /(?<assignPrefix>[:=]\s*['"`])(?<secretVal>[A-Za-z0-9+/]{40,})(?<assignSuffix>['"`])/g,
    // Bearer tokens
    /(?<bearerPrefix>Bearer\s+)(?<bearerToken>[A-Za-z0-9._-]{20,})/gi,
    // Private keys
    /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
    // Connection strings
    /(?<connPrefix>(?:mongodb|postgres|mysql|redis|amqp):\/\/)(?<connCreds>[^@\s]+@)/gi,
  ];

  let redacted = content;
  for (const pattern of patterns) {
    redacted = redacted.replace(pattern, (match) => {
      // Keep first 4 chars, redact the rest
      const visible = match.slice(0, 8);
      return `${visible}[REDACTED]`;
    });
  }

  return redacted;
}

export default { extractSnippets, redactSecrets };
