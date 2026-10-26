// ============================================================
// RepoReality — README Parser
// Extracts sections, summaries, and claim-worthy content
// ============================================================

export interface ReadmeSection {
  heading: string;
  level: number;
  content: string;
  startIndex: number;
}

export interface ParsedReadme {
  title: string;
  summary: string;
  sections: ReadmeSection[];
  rawLength: number;
}

/**
 * Parse a README into structured sections.
 */
export function parseReadme(readme: string): ParsedReadme {
  const lines = readme.split('\n');
  const sections: ReadmeSection[] = [];
  let title = '';

  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // Save previous section
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          heading: currentHeading || '(introduction)',
          level: currentLevel,
          content: currentContent.join('\n').trim(),
          startIndex: currentStart,
        });
      }

      currentLevel = headingMatch[1]!.length;
      currentHeading = headingMatch[2]!.trim();
      currentContent = [];
      currentStart = i;

      // First h1 is the title
      if (!title && currentLevel === 1) {
        title = currentHeading;
      }
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentHeading || currentContent.length > 0) {
    sections.push({
      heading: currentHeading || '(introduction)',
      level: currentLevel,
      content: currentContent.join('\n').trim(),
      startIndex: currentStart,
    });
  }

  // Generate summary from first meaningful section(s)
  const summary = generateSummary(sections, lines.join('\n'));

  // If no title found, use first line
  if (!title && lines.length > 0) {
    title = lines[0]!.replace(/^#+\s*/, '').trim();
  }

  return {
    title,
    summary,
    sections,
    rawLength: readme.length,
  };
}

function generateSummary(sections: ReadmeSection[], fullText: string): string {
  // Take the first section content or intro text, up to 500 chars
  const intro = sections.find(
    (s) =>
      s.heading === '(introduction)' ||
      /about|overview|description|introduction|what/i.test(s.heading)
  );

  if (intro && intro.content.length > 20) {
    return cleanText(intro.content).slice(0, 500);
  }

  // Fall back to first 500 chars of content
  return cleanText(fullText).slice(0, 500);
}

/**
 * Extract claim-worthy sentences from README sections.
 * Returns sentences that make verifiable assertions.
 */
export function extractClaimSentences(readme: string): string[] {
  const parsed = parseReadme(readme);
  const candidates: string[] = [];

  // Skip sections unlikely to contain implementation claims
  const skipSections = /license|contributing|changelog|credits|authors|acknowledgment|roadmap|todo|faq/i;

  for (const section of parsed.sections) {
    if (skipSections.test(section.heading)) continue;

    const sentences = splitSentences(section.content);
    for (const sentence of sentences) {
      if (isClaimWorthy(sentence)) {
        candidates.push(sentence.trim());
      }
    }
  }

  return [...new Set(candidates)];
}

function splitSentences(text: string): string[] {
  // Remove markdown formatting
  const cleaned = cleanText(text);

  // Split on sentence boundaries
  return cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .flatMap((s) => s.split('\n'))
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 500);
}

/**
 * Determine if a sentence makes a verifiable claim.
 */
function isClaimWorthy(sentence: string): boolean {
  const lower = sentence.toLowerCase();

  // Must contain an assertion pattern
  const assertionPatterns = [
    /\buse[sd]?\b/i,
    /\bbuilt\s+(with|on|using)\b/i,
    /\bsupports?\b/i,
    /\bpowered\s+by\b/i,
    /\bimplements?\b/i,
    /\bprovides?\b/i,
    /\bfeatures?\b/i,
    /\bincludes?\b/i,
    /\benables?\b/i,
    /\bintegrates?\b/i,
    /\bconnects?\s+to\b/i,
    /\bruns?\s+on\b/i,
    /\bwritten\s+in\b/i,
    /\bhandles?\b/i,
    /\bmanages?\b/i,
    /\bauthenticat/i,
    /\bauthoriz/i,
    /\bencrypt/i,
    /\bvalidat/i,
    /\bserves?\b/i,
    /\bdeploys?\b/i,
    /\btests?\b/i,
    /\bmonitors?\b/i,
    /\bcaches?\b/i,
    /\blogs?\b/i,
    /\bstores?\b/i,
    /\bqueues?\b/i,
    /\bschedules?\b/i,
    /\bstreams?\b/i,
  ];

  const hasAssertion = assertionPatterns.some((p) => p.test(sentence));
  if (!hasAssertion) return false;

  // Reject future/planned items
  const futurePatterns = [
    /\bwill\b/i,
    /\bplanned\b/i,
    /\bcoming\s+soon\b/i,
    /\btodo\b/i,
    /\bin\s+the\s+future\b/i,
    /\bwould\s+like\b/i,
    /\bhope\s+to\b/i,
    /\beventually\b/i,
    /\broadmap\b/i,
    /\bproposed\b/i,
  ];
  if (futurePatterns.some((p) => p.test(sentence))) return false;

  // Reject generic/vague sentences
  if (sentence.length < 20) return false;
  if (/^\s*[-*•]\s*$/.test(sentence)) return false;

  // Must contain some technical substance
  const hasTechContent =
    /[A-Z][a-zA-Z]+(?:\.js|\.ts|\.py|\.go|\.rs)?/.test(sentence) || // PascalCase names
    /(?:API|REST|GraphQL|SQL|HTTP|JWT|OAuth|CORS|CSRF|TLS|SSL|AWS|GCP|Azure|CI\/CD)/i.test(sentence) ||
    /(?:database|server|client|frontend|backend|middleware|router|controller|model|schema|migration|queue|cache)/i.test(sentence);

  return hasTechContent || lower.split(' ').length >= 5;
}

function cleanText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
    .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/~~([^~]+)~~/g, '$1') // Remove strikethrough
    .replace(/>\s+/g, '') // Remove blockquotes
    .replace(/\|[^|\n]+/g, '') // Remove table content
    .replace(/[-=]{3,}/g, '') // Remove horizontal rules
    .replace(/\n{3,}/g, '\n\n') // Normalize blank lines
    .trim();
}

export default { parseReadme, extractClaimSentences };
