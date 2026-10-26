import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import type { AuditState } from '../types';
import { CategoryBadge } from '../components/Badge';
import {
  StarIcon,
  GitForkIcon,
  ExternalLinkIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  SpinnerIcon,
  AlertTriangleIcon,
  FileTextIcon,
  RefreshCwIcon,
  TerminalIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '../components/Icons';

interface AuditPageProps {
  auditState: AuditState;
  setAuditState: React.Dispatch<React.SetStateAction<AuditState>>;
  onComplete: () => void;
  onBack: () => void;
}

interface ProgressStage {
  id: string;
  label: string;
  description: string;
}

const PROGRESS_STAGES: ProgressStage[] = [
  {
    id: 'selecting_evidence',
    label: 'Selecting source evidence...',
    description: 'Ranking file relevance, inspecting file tree, and indexing candidate modules.',
  },
  {
    id: 'running_analysis',
    label: 'Running Gemma analysis...',
    description: 'Analyzing claims with Google Gemma, extracting source citations and AST signals.',
  },
  {
    id: 'validating',
    label: 'Validating findings...',
    description: 'Checking citation line bounds, confidence metrics, and verifying evidence authenticity.',
  },
  {
    id: 'preparing_report',
    label: 'Preparing report...',
    description: 'Synthesizing code quality notes, security indicators, and test suite analysis.',
  },
];

// Language color mappings for visual language bar
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Vue: '#41b883',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
};

export function AuditPage({ auditState, setAuditState, onComplete, onBack }: AuditPageProps) {
  const [phase, setPhase] = useState<'selection' | 'analyzing'>('selection');
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const inspection = auditState.inspection;
  const repository = inspection?.repository;
  const claims = auditState.claims;

  const selectedCount = claims.filter((c) => c.selected).length;

  // Toggle single claim
  const handleToggleClaim = (claimId: string) => {
    setAuditState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) =>
        c.id === claimId ? { ...c, selected: !c.selected } : c
      ),
    }));
  };

  // Select all or deselect all
  const handleToggleAll = (select: boolean) => {
    setAuditState((prev) => ({
      ...prev,
      claims: prev.claims.map((c) => ({ ...c, selected: select })),
    }));
  };

  // Toggle source excerpt visibility
  const toggleSourceExcerpt = (claimId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [claimId]: !prev[claimId],
    }));
  };

  // Execute Analysis
  const handleStartAnalysis = async () => {
    if (selectedCount === 0 || !inspection) return;

    setPhase('analyzing');
    setAnalysisError(null);
    setCurrentStageIndex(0);

    const selectedClaimIds = claims.filter((c) => c.selected).map((c) => c.id);

    try {
      // Stage 1: Selecting source evidence...
      setCurrentStageIndex(0);

      // Transition to Stage 2 after a brief delay
      const stageTimer1 = setTimeout(() => {
        if (isMounted.current) setCurrentStageIndex(1);
      }, 1200);

      const response = await api.analyzeAudit({
        url: auditState.repositoryUrl,
        selectedClaimIds,
        inspection,
        claims: claims.filter((c) => c.selected),
      });

      clearTimeout(stageTimer1);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Audit analysis failed. Please try again.');
      }

      // Stage 3: Validating findings...
      if (isMounted.current) setCurrentStageIndex(2);
      await new Promise((r) => setTimeout(r, 600));

      // Stage 4: Preparing report...
      if (isMounted.current) setCurrentStageIndex(3);
      await new Promise((r) => setTimeout(r, 600));

      // Complete
      if (isMounted.current) {
        setCurrentStageIndex(4); // All done
        setAuditState((prev) => ({
          ...prev,
          report: response.data ?? null,
          progress: { stage: 'complete', message: 'Analysis complete!' },
          error: null,
        }));

        setTimeout(() => {
          if (isMounted.current) {
            onComplete();
          }
        }, 500);
      }
    } catch (err) {
      if (isMounted.current) {
        const errorMsg = err instanceof Error ? err.message : 'Analysis failed';
        setAnalysisError(errorMsg);
        setAuditState((prev) => ({
          ...prev,
          error: errorMsg,
          progress: { stage: 'error', message: errorMsg },
        }));
      }
    }
  };

  // Calculate languages percentage
  const totalLanguageBytes = repository?.languages
    ? Object.values(repository.languages).reduce((acc, bytes) => acc + bytes, 0)
    : 0;

  const topLanguages = repository?.languages
    ? Object.entries(repository.languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([lang, bytes]) => ({
          name: lang,
          bytes,
          percentage: totalLanguageBytes > 0 ? Math.round((bytes / totalLanguageBytes) * 100) : 0,
          color: LANGUAGE_COLORS[lang] || '#58a6ff',
        }))
    : [];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Navigation / Header Bar */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-[#30363d]">
          <button
            type="button"
            onClick={onBack}
            disabled={phase === 'analyzing' && !analysisError}
            className="flex items-center gap-2 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Back to Repository Input</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#8b949e]">Step 2 of 3</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#21262d] text-[#58a6ff] border border-[#30363d]">
              {phase === 'selection' ? 'Claim Selection' : 'Audit In Progress'}
            </span>
          </div>
        </div>

        {/* Phase A: Claim Selection */}
        {phase === 'selection' && (
          <div className="space-y-6">
            {/* Repository Summary Card */}
            {repository && (
              <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#30363d]/60">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-bold text-[#e6edf3] tracking-tight">
                        {repository.fullName}
                      </h1>
                      <a
                        href={repository.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#58a6ff] hover:underline"
                        aria-label="Open repository on GitHub"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                        <span>GitHub</span>
                      </a>
                      <span className="text-xs font-mono px-2 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[#8b949e]">
                        branch: {repository.defaultBranch}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-[#8b949e] leading-relaxed max-w-3xl">
                      {repository.description || 'No description provided by repository owner.'}
                    </p>
                  </div>

                  {/* Stars & Forks Stats */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-mono">
                      <StarIcon className="w-4 h-4 text-[#d29922]" />
                      <span className="font-semibold text-[#e6edf3]">
                        {repository.stars.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-xs font-mono">
                      <GitForkIcon className="w-4 h-4 text-[#8b949e]" />
                      <span className="font-semibold text-[#e6edf3]">
                        {repository.forks.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Languages breakdown bar */}
                {topLanguages.length > 0 && (
                  <div className="pt-4">
                    <div className="flex items-center justify-between text-xs text-[#8b949e] mb-1.5 font-mono">
                      <span>Codebase Languages</span>
                      <span>{inspection.totalFiles} files indexed</span>
                    </div>
                    {/* Visual bar */}
                    <div className="h-2 w-full rounded-full bg-[#21262d] overflow-hidden flex">
                      {topLanguages.map((l) => (
                        <div
                          key={l.name}
                          style={{ width: `${Math.max(l.percentage, 2)}%`, backgroundColor: l.color }}
                          title={`${l.name}: ${l.percentage}%`}
                        />
                      ))}
                    </div>
                    {/* Language badges */}
                    <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs font-mono">
                      {topLanguages.map((l) => (
                        <div key={l.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: l.color }}
                          />
                          <span className="text-[#e6edf3] font-medium">{l.name}</span>
                          <span className="text-[#8b949e]">{l.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detected Manifests & Files summary */}
                <div className="mt-4 pt-4 border-t border-[#30363d]/60 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-[#8b949e]">Detected Manifests:</span>
                  {inspection.manifests && inspection.manifests.length > 0 ? (
                    inspection.manifests.map((m) => (
                      <span
                        key={m.path}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono bg-[#21262d] text-[#e6edf3] border border-[#30363d]"
                      >
                        <FileTextIcon className="w-3 h-3 text-[#58a6ff]" />
                        <span>{m.path}</span>
                        <span className="text-[10px] text-[#8b949e]">({m.type})</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#8b949e] italic">No standard package manifests found</span>
                  )}

                  {inspection.testFiles && inspection.testFiles.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono bg-[#238636]/10 text-[#3fb950] border border-[#2ea043]/30">
                      <span>{inspection.testFiles.length} test files detected</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Claims Selection Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b22] border border-[#30363d] p-4 rounded-xl">
              <div>
                <h2 className="text-lg font-bold text-[#e6edf3] flex items-center gap-2">
                  <span>Extracted Technical Claims</span>
                  <span className="px-2 py-0.5 text-xs font-mono bg-[#21262d] text-[#58a6ff] border border-[#30363d] rounded-full">
                    {selectedCount} of {claims.length} selected
                  </span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-0.5">
                  Select the claims you want RepoReality to verify against codebase evidence.
                </p>
              </div>

              {/* Select All / Deselect All */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleAll(true)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAll(false)}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Claims List */}
            {claims.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#161b22] border border-[#30363d]">
                <FileTextIcon className="w-8 h-8 text-[#8b949e] mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-[#e6edf3]">No claims extracted</h3>
                <p className="text-xs text-[#8b949e] mt-1 max-w-md mx-auto">
                  Gemma could not identify concrete technical claims in the README. You may return and check another repository.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    onClick={() => handleToggleClaim(claim.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer select-none ${
                      claim.selected
                        ? 'bg-[#161b22] border-[#58a6ff]/40 shadow-sm'
                        : 'bg-[#161b22]/50 border-[#30363d]/60 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Custom Checkbox */}
                      <input
                        type="checkbox"
                        checked={claim.selected}
                        onChange={() => {}} // handled by div click
                        aria-label={`Select claim: ${claim.text}`}
                        className="mt-1 w-4 h-4 rounded border-[#30363d] bg-[#0d1117] text-[#1f6feb] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <CategoryBadge category={claim.category} />
                          <span className="text-[11px] font-mono text-[#8b949e]">ID: {claim.id}</span>
                        </div>

                        <p className="text-sm font-medium text-[#e6edf3] leading-snug">
                          {claim.text}
                        </p>

                        {/* README Source citation toggle */}
                        {claim.source && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSourceExcerpt(claim.id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-[#58a6ff] hover:underline"
                            >
                              <span>README Source Excerpt</span>
                              {expandedSources[claim.id] ? (
                                <ChevronUpIcon className="w-3 h-3" />
                              ) : (
                                <ChevronDownIcon className="w-3 h-3" />
                              )}
                            </button>

                            {expandedSources[claim.id] && (
                              <blockquote className="mt-2 p-2.5 rounded bg-[#0d1117] border-l-2 border-[#58a6ff] text-xs text-[#8b949e] font-mono whitespace-pre-wrap leading-relaxed">
                                {claim.source}
                              </blockquote>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="sticky bottom-4 z-20 p-4 rounded-xl bg-[#161b22]/95 backdrop-blur border border-[#30363d] flex items-center justify-between shadow-2xl">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={selectedCount === 0}
                className="px-6 py-2.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] active:bg-[#238636] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
              >
                <TerminalIcon className="w-4 h-4" />
                <span>
                  Run Analysis ({selectedCount} Claim{selectedCount === 1 ? '' : 's'})
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Phase B: Analysis Progress & Live Status */}
        {phase === 'analyzing' && (
          <div className="space-y-6 max-w-2xl mx-auto py-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#e6edf3] tracking-tight mb-2">
                Auditing Codebase Reality
              </h2>
              <p className="text-xs font-mono text-[#8b949e]">
                Target: <span className="text-[#58a6ff]">{repository?.fullName}</span> &bull; {selectedCount} Claims
              </p>
            </div>

            {/* Error Banner */}
            {analysisError && (
              <div className="p-4 rounded-xl bg-[#f85149]/10 border border-[#f85149]/40 text-[#f85149] space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-sm">Analysis Execution Error</h3>
                    <p className="text-xs text-[#e6edf3] mt-1 leading-relaxed">
                      {analysisError}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleStartAnalysis}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCwIcon className="w-3.5 h-3.5" />
                    <span>Retry Analysis</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPhase('selection');
                      setAnalysisError(null);
                    }}
                    className="px-3 py-1.5 rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-xs font-medium border border-[#30363d] cursor-pointer"
                  >
                    Back to Claim Selection
                  </button>
                </div>
              </div>
            )}

            {/* Progress Stages Timeline */}
            <div className="p-6 rounded-xl bg-[#161b22] border border-[#30363d] shadow-xl space-y-6">
              {PROGRESS_STAGES.map((stage, idx) => {
                const isCompleted = currentStageIndex > idx;
                const isActive = currentStageIndex === idx && !analysisError;
                const isPending = currentStageIndex < idx;

                return (
                  <div key={stage.id} className="flex items-start gap-4 relative">
                    {/* Connecting vertical line */}
                    {idx < PROGRESS_STAGES.length - 1 && (
                      <div
                        className={`absolute left-[15px] top-8 w-[2px] h-[calc(100%+8px)] ${
                          isCompleted ? 'bg-[#3fb950]' : 'bg-[#30363d]'
                        }`}
                      />
                    )}

                    {/* Step Icon */}
                    <div className="relative z-10 shrink-0">
                      {isCompleted ? (
                        <div className="w-8 h-8 rounded-full bg-[#238636]/20 border border-[#2ea043] text-[#3fb950] flex items-center justify-center">
                          <CheckCircleIcon className="w-4 h-4" />
                        </div>
                      ) : isActive ? (
                        <div className="w-8 h-8 rounded-full bg-[#1f6feb]/20 border border-[#58a6ff] text-[#58a6ff] flex items-center justify-center animate-pulse shadow-md shadow-[#1f6feb]/30">
                          <SpinnerIcon className="w-4 h-4 text-[#58a6ff]" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#21262d] border border-[#30363d] text-[#484f58] flex items-center justify-center font-mono text-xs">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-semibold ${
                            isActive
                              ? 'text-[#58a6ff]'
                              : isCompleted
                              ? 'text-[#e6edf3]'
                              : 'text-[#8b949e]'
                          }`}
                        >
                          {stage.label}
                        </h4>
                        {isActive && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/30 animate-pulse">
                            Processing
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#238636]/20 text-[#3fb950]">
                            Done
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#8b949e] mt-1 leading-relaxed">
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gemma Status Callout */}
            {!analysisError && (
              <div className="p-4 rounded-xl bg-[#161b22]/50 border border-[#30363d] flex items-center justify-between text-xs text-[#8b949e] font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#58a6ff] animate-ping" />
                  <span>Gemma model actively processing AST &amp; claims...</span>
                </div>
                <span>Safe Static Analysis</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
