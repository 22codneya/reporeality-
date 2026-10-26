import React, { useState } from 'react';
import { api } from '../api/client';
import type { AuditState } from '../types';
import {
  LogoIcon,
  SearchIcon,
  SpinnerIcon,
  ShieldIcon,
  CheckCircleIcon,
  FileTextIcon,
  TerminalIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
} from '../components/Icons';

interface HomePageProps {
  onStartAudit: (state: AuditState) => void;
}

const SAMPLE_REPOS = [
  { name: 'expressjs/express', desc: 'Fast, unopinionated, minimalist web framework for Node.js' },
  { name: 'fastify/fastify', desc: 'Fast and low overhead web framework for Node.js' },
  { name: 'colinhacks/zod', desc: 'TypeScript-first schema validation with static type inference' },
  { name: 'honojs/hono', desc: 'Fast, lightweight Web Standards-based web framework' },
];

export function HomePage({ onStartAudit }: HomePageProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Client-side validation of GitHub repository URL
   */
  const validateUrl = (url: string): { valid: boolean; normalized: string; error?: string } => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { valid: false, normalized: '', error: 'Please enter a GitHub repository URL.' };
    }

    try {
      // Allow shorthand "owner/repo" or full URL
      let targetUrl = trimmed;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(targetUrl)) {
          targetUrl = `https://github.com/${targetUrl}`;
        } else {
          targetUrl = `https://${targetUrl}`;
        }
      }

      const parsed = new URL(targetUrl);
      if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
        return {
          valid: false,
          normalized: '',
          error: 'Only public GitHub repositories (https://github.com/owner/repo) are supported.',
        };
      }

      const parts = parsed.pathname
        .replace(/^\//, '')
        .replace(/\/$/, '')
        .replace(/\.git$/, '')
        .split('/');

      if (parts.length < 2 || !parts[0] || !parts[1]) {
        return {
          valid: false,
          normalized: '',
          error: 'URL must specify both an owner and repository name (e.g. https://github.com/owner/repo).',
        };
      }

      const [owner, repo] = parts;
      const normalized = `https://github.com/${owner}/${repo}`;
      return { valid: true, normalized };
    } catch {
      return {
        valid: false,
        normalized: '',
        error: 'Invalid URL format. Please provide a valid GitHub repository URL.',
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = validateUrl(repoUrl);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid GitHub repository URL.');
      return;
    }

    const normalizedUrl = validation.normalized;
    setLoading(true);

    try {
      // Step 1: Inspect repository
      setLoadingMessage('Inspecting repository structure and manifests...');
      const inspectRes = await api.inspectRepository(normalizedUrl);

      if (!inspectRes.success || !inspectRes.data) {
        setErrorMessage(
          inspectRes.error ||
            'Failed to inspect repository. Ensure the repository exists, is public, and is accessible.'
        );
        setLoading(false);
        return;
      }

      const inspection = inspectRes.data;

      // Step 2: Extract technical claims from README
      setLoadingMessage('Extracting technical claims from README via Gemma...');
      const claimsRes = await api.extractClaims({
        url: normalizedUrl,
        readme: inspection.readme,
        fileTree: inspection.fileTree,
        manifests: inspection.manifests,
      });

      if (!claimsRes.success || !claimsRes.data) {
        setErrorMessage(
          claimsRes.error ||
            'Failed to extract claims from README. The repository may not have a readable README or AI extraction failed.'
        );
        setLoading(false);
        return;
      }

      const claimsData = claimsRes.data;
      const claimsWithSelection = (claimsData.claims || []).map((c) => ({
        ...c,
        selected: true, // all selected by default per specifications
      }));

      // Construct and dispatch audit state
      const initialState: AuditState = {
        repositoryUrl: normalizedUrl,
        inspection,
        claims: claimsWithSelection,
        report: null,
        progress: {
          stage: 'selecting_evidence',
          message: 'Claims ready for verification',
        },
        error: null,
      };

      onStartAudit(initialState);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An unexpected error occurred while analyzing repository.'
      );
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSelectSample = (sampleName: string) => {
    setRepoUrl(`https://github.com/${sampleName}`);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex flex-col">
      {/* Top Hero Section */}
      <div className="relative overflow-hidden border-b border-[#30363d]/60">
        {/* Subtle grid background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(#1f6feb_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#1f6feb]/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#58a6ff] mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
            <span>Automated Codebase Reality Check &bull; Powered by Google Gemma</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#e6edf3] mb-6">
            Verify the claims, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#58a6ff] via-[#79c0ff] to-[#a5d6ff] bg-clip-text text-transparent">
              not just the README.
            </span>
          </h1>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-[#8b949e] leading-relaxed mb-10">
            RepoReality bridges the gap between open-source project claims and codebase reality.
            It extracts technical commitments from READMEs and audits actual implementation
            evidence, test files, and AST signals using Google Gemma.
            Fast, transparent, and grounded in source citations.
          </p>

          {/* URL Input Form */}
          <div className="max-w-2xl mx-auto mb-6">
            <form onSubmit={handleSubmit} className="relative">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-xl bg-[#161b22] border border-[#30363d] shadow-2xl focus-within:border-[#58a6ff] transition-all">
                <div className="relative flex-1 flex items-center pl-3">
                  <SearchIcon className="w-5 h-5 text-[#8b949e] shrink-0 mr-2" />
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    disabled={loading}
                    className="w-full bg-transparent text-[#e6edf3] placeholder-[#8b949e] text-sm focus:outline-none font-mono py-2"
                    aria-label="GitHub Repository URL"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !repoUrl.trim()}
                  className="px-6 py-3 rounded-lg bg-[#238636] hover:bg-[#2ea043] active:bg-[#238636] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-md shrink-0 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <SpinnerIcon className="w-4 h-4 text-white" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <span>Analyze Repository</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Loading Indicator */}
            {loading && (
              <div className="mt-4 p-3 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center gap-3 text-xs font-mono text-[#58a6ff] animate-pulse">
                <SpinnerIcon className="w-4 h-4" />
                <span>{loadingMessage}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-[#f85149]/10 border border-[#f85149]/30 text-xs text-[#f85149] flex items-center gap-2 text-left">
                <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Quick Examples */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[#8b949e]">
            <span className="font-mono text-[11px] text-[#8b949e]">Quick samples:</span>
            {SAMPLE_REPOS.map((sample) => (
              <button
                key={sample.name}
                type="button"
                onClick={() => handleSelectSample(sample.name)}
                disabled={loading}
                className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors font-mono text-[11px] hover:text-[#58a6ff] cursor-pointer"
                title={sample.desc}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works Section (4 Steps) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tight text-[#e6edf3] mb-3">
            How RepoReality Works
          </h2>
          <p className="text-sm text-[#8b949e] max-w-xl mx-auto">
            A 4-step pipeline designed to evaluate claims without executing unvetted code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] relative flex flex-col hover:border-[#58a6ff]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff] flex items-center justify-center font-bold font-mono text-sm mb-4 border border-[#1f6feb]/30">
              01
            </div>
            <h3 className="text-base font-semibold text-[#e6edf3] mb-2 flex items-center gap-2">
              <SearchIcon className="w-4 h-4 text-[#58a6ff]" />
              Enter URL
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Target any public GitHub repository. RepoReality fetches the repository metadata, directory tree, and package manifests safely.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] relative flex flex-col hover:border-[#58a6ff]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff] flex items-center justify-center font-bold font-mono text-sm mb-4 border border-[#1f6feb]/30">
              02
            </div>
            <h3 className="text-base font-semibold text-[#e6edf3] mb-2 flex items-center gap-2">
              <FileTextIcon className="w-4 h-4 text-[#58a6ff]" />
              Extract Claims
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Gemma parses the README to identify concrete functional claims, performance promises, framework features, and compatibility guarantees.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] relative flex flex-col hover:border-[#58a6ff]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#1f6feb]/20 text-[#58a6ff] flex items-center justify-center font-bold font-mono text-sm mb-4 border border-[#1f6feb]/30">
              03
            </div>
            <h3 className="text-base font-semibold text-[#e6edf3] mb-2 flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-[#58a6ff]" />
              Analyze Evidence
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              The pipeline scores file relevance, inspects source files and test suites, and cross-references citations directly against the AST.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] relative flex flex-col hover:border-[#58a6ff]/50 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#238636]/20 text-[#3fb950] flex items-center justify-center font-bold font-mono text-sm mb-4 border border-[#238636]/30">
              04
            </div>
            <h3 className="text-base font-semibold text-[#e6edf3] mb-2 flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4 text-[#3fb950]" />
              Get Report
            </h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">
              Receive a detailed audit report with line-specific citations, confidence scores, consistency ratings, and actionable recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Disclosures & Notice Section */}
      <div className="mt-auto border-t border-[#30363d]/60 bg-[#161b22]/40 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#8b949e]">
            {/* Privacy Disclosure */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[#161b22] border border-[#30363d]/60">
              <ShieldIcon className="w-5 h-5 text-[#58a6ff] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#e6edf3] mb-1">Privacy & Data Disclosure</h4>
                <p className="leading-relaxed">
                  Selected code from public repositories is sent to Google&apos;s hosted API for analysis.
                  RepoReality only accesses publicly available GitHub repositories and does not store private repository tokens.
                </p>
              </div>
            </div>

            {/* Limitations Note */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-[#161b22] border border-[#30363d]/60">
              <AlertTriangleIcon className="w-5 h-5 text-[#d29922] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-[#e6edf3] mb-1">Technical Limitations</h4>
                <p className="leading-relaxed">
                  Static analysis only. No code execution. Not a security certification. Findings are evidence-based signals generated by automated analysis and should be verified for mission-critical deployments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
