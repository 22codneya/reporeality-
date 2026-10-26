import React, { useState } from 'react';
import type { AuditState, AuditLabel, ClaimFinding } from '../types';
import {
  AuditLabelBadge,
  ConfidenceBadge,
  SeverityBadge,
  PriorityBadge,
} from '../components/Badge';
import { CodeBlock } from '../components/CodeBlock';
import {
  exportAsMarkdown,
  exportAsJson,
  downloadFile,
} from '../utils/exportReport';
import {
  ExternalLinkIcon,
  DownloadIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ShieldIcon,
  FileTextIcon,
  TerminalIcon,
  CodeIcon,
  SearchIcon,
  FileCodeIcon,
  LayersIcon,
} from '../components/Icons';

interface ReportPageProps {
  auditState: AuditState;
  onBack: () => void;
}

export function ReportPage({ auditState, onBack }: ReportPageProps) {
  const report = auditState.report;
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'findings' | 'quality' | 'security' | 'tests' | 'recommendations'>('findings');

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-xl bg-[#161b22] border border-[#30363d] text-center space-y-4">
          <AlertTriangleIcon className="w-10 h-10 text-[#d29922] mx-auto" />
          <h2 className="text-xl font-bold">No Audit Report Found</h2>
          <p className="text-sm text-[#8b949e]">
            There is no audit report available for this session. Please select a repository and run the audit.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="w-full py-2.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Start New Audit
          </button>
        </div>
      </div>
    );
  }

  const { repository, scanScope, findings, codeQualitySignals, securitySignals, recommendations, testAnalysis, limitations, disclaimer, timestamp } = report;

  // Format date
  const scanDate = new Date(timestamp).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Export handlers
  const handleExportMarkdown = () => {
    const md = exportAsMarkdown(report);
    const dateStr = new Date(timestamp).toISOString().split('T')[0] ?? 'report';
    const filename = `reporeality-${repository.owner}-${repository.repo}-${dateStr}.md`;
    downloadFile(md, filename, 'text/markdown;charset=utf-8');
  };

  const handleExportJson = () => {
    const json = exportAsJson(report);
    const dateStr = new Date(timestamp).toISOString().split('T')[0] ?? 'report';
    const filename = `reporeality-${repository.owner}-${repository.repo}-${dateStr}.json`;
    downloadFile(json, filename, 'application/json;charset=utf-8');
  };

  // Label summary counts
  const labelCounts: Record<AuditLabel, number> = {
    IMPLEMENTATION_EVIDENCE_FOUND: 0,
    PARTIAL_EVIDENCE: 0,
    NOT_VERIFIED: 0,
    POTENTIAL_INCONSISTENCY: 0,
    NEEDS_RUNTIME_CHECK: 0,
  };

  findings.forEach((f) => {
    if (labelCounts[f.label] !== undefined) {
      labelCounts[f.label] += 1;
    }
  });

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    if (selectedLabelFilter && f.label !== selectedLabelFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = f.claimText.toLowerCase().includes(q);
      const matchSummary = f.summary.toLowerCase().includes(q);
      const matchFile = f.evidence?.some((e) => e.filePath.toLowerCase().includes(q));
      return matchText || matchSummary || matchFile;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Actions & Breadcrumb Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#30363d]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Start Over / New Audit</span>
          </button>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-[#58a6ff]" />
              <span>Export Markdown</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Report Header Card */}
        <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#30363d]/60">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#8b949e] font-mono mb-2">
                <span>AUDIT REPORT</span>
                <span>&bull;</span>
                <span>{scanDate}</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#e6edf3]">
                  {repository.fullName}
                </h1>
                <a
                  href={repository.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-xs font-mono text-[#58a6ff] border border-[#30363d] transition-colors"
                >
                  <span>View Repository</span>
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              </div>

              {repository.description && (
                <p className="mt-2 text-sm text-[#8b949e] max-w-3xl leading-relaxed">
                  {repository.description}
                </p>
              )}
            </div>

            {/* Scan Scope Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs shrink-0">
              <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-center">
                <div className="text-[#8b949e] text-[11px] mb-1">Method</div>
                <div className="text-[#58a6ff] font-bold uppercase">{scanScope.analysisMethod}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-center">
                <div className="text-[#8b949e] text-[11px] mb-1">Files Inspected</div>
                <div className="text-[#e6edf3] font-bold">{scanScope.filesInspected}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-center">
                <div className="text-[#8b949e] text-[11px] mb-1">Claims Audited</div>
                <div className="text-[#e6edf3] font-bold">{scanScope.claimsAnalyzed}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-center">
                <div className="text-[#8b949e] text-[11px] mb-1">Model Calls</div>
                <div className="text-[#3fb950] font-bold">{scanScope.modelCallsMade}</div>
              </div>
            </div>
          </div>

          {/* Verdict Summary Bar with Filter Badges */}
          <div className="pt-6">
            <div className="flex items-center justify-between text-xs text-[#8b949e] mb-3 font-mono">
              <span>FINDINGS BY VERDICT (CLICK TO FILTER)</span>
              {selectedLabelFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedLabelFilter(null)}
                  className="text-[#58a6ff] hover:underline"
                >
                  Clear filter (Show all {findings.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Evidence Found */}
              <button
                type="button"
                onClick={() =>
                  setSelectedLabelFilter((prev) =>
                    prev === 'IMPLEMENTATION_EVIDENCE_FOUND' ? null : 'IMPLEMENTATION_EVIDENCE_FOUND'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLabelFilter === 'IMPLEMENTATION_EVIDENCE_FOUND'
                    ? 'bg-[#238636]/30 border-[#2ea043] ring-1 ring-[#2ea043]'
                    : 'bg-[#238636]/10 hover:bg-[#238636]/20 border-[#2ea043]/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#3fb950] font-semibold mb-1">
                  <span>Evidence Found</span>
                  <CheckCircleIcon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#3fb950]">
                  {labelCounts.IMPLEMENTATION_EVIDENCE_FOUND}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1">Confirmed by source</div>
              </button>

              {/* Partial Evidence */}
              <button
                type="button"
                onClick={() =>
                  setSelectedLabelFilter((prev) =>
                    prev === 'PARTIAL_EVIDENCE' ? null : 'PARTIAL_EVIDENCE'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLabelFilter === 'PARTIAL_EVIDENCE'
                    ? 'bg-[#d29922]/30 border-[#bb8009] ring-1 ring-[#bb8009]'
                    : 'bg-[#d29922]/10 hover:bg-[#d29922]/20 border-[#bb8009]/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#d29922] font-semibold mb-1">
                  <span>Partial Evidence</span>
                  <AlertTriangleIcon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#d29922]">
                  {labelCounts.PARTIAL_EVIDENCE}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1">Incomplete proof</div>
              </button>

              {/* Needs Runtime Check */}
              <button
                type="button"
                onClick={() =>
                  setSelectedLabelFilter((prev) =>
                    prev === 'NEEDS_RUNTIME_CHECK' ? null : 'NEEDS_RUNTIME_CHECK'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLabelFilter === 'NEEDS_RUNTIME_CHECK'
                    ? 'bg-[#388bfd]/30 border-[#1f6feb] ring-1 ring-[#1f6feb]'
                    : 'bg-[#388bfd]/10 hover:bg-[#388bfd]/20 border-[#1f6feb]/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#58a6ff] font-semibold mb-1">
                  <span>Runtime Check</span>
                  <TerminalIcon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#58a6ff]">
                  {labelCounts.NEEDS_RUNTIME_CHECK}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1">Benchmark / Env needed</div>
              </button>

              {/* Not Verified */}
              <button
                type="button"
                onClick={() =>
                  setSelectedLabelFilter((prev) =>
                    prev === 'NOT_VERIFIED' ? null : 'NOT_VERIFIED'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLabelFilter === 'NOT_VERIFIED'
                    ? 'bg-[#30363d] border-[#484f58] ring-1 ring-[#8b949e]'
                    : 'bg-[#161b22] hover:bg-[#21262d] border-[#30363d]'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#8b949e] font-semibold mb-1">
                  <span>Not Verified</span>
                  <span className="w-2 h-2 rounded-full bg-[#8b949e]" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#8b949e]">
                  {labelCounts.NOT_VERIFIED}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1">No source citation</div>
              </button>

              {/* Potential Inconsistency */}
              <button
                type="button"
                onClick={() =>
                  setSelectedLabelFilter((prev) =>
                    prev === 'POTENTIAL_INCONSISTENCY' ? null : 'POTENTIAL_INCONSISTENCY'
                  )
                }
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedLabelFilter === 'POTENTIAL_INCONSISTENCY'
                    ? 'bg-[#f85149]/30 border-[#da3633] ring-1 ring-[#da3633]'
                    : 'bg-[#f85149]/10 hover:bg-[#f85149]/20 border-[#da3633]/40'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-[#f85149] font-semibold mb-1">
                  <span>Inconsistency</span>
                  <AlertTriangleIcon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold font-mono text-[#f85149]">
                  {labelCounts.POTENTIAL_INCONSISTENCY}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-1">Code conflicts claim</div>
              </button>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-[#30363d] overflow-x-auto pb-px text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('findings')}
            className={`px-4 py-2.5 font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'findings'
                ? 'border-[#58a6ff] text-[#58a6ff]'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Claim Findings ({findings.length})
          </button>

          {codeQualitySignals && codeQualitySignals.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('quality')}
              className={`px-4 py-2.5 font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'quality'
                  ? 'border-[#58a6ff] text-[#58a6ff]'
                  : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              Code Quality ({codeQualitySignals.length})
            </button>
          )}

          {securitySignals && securitySignals.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2.5 font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'security'
                  ? 'border-[#58a6ff] text-[#58a6ff]'
                  : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              Security Signals ({securitySignals.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`px-4 py-2.5 font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === 'tests'
                ? 'border-[#58a6ff] text-[#58a6ff]'
                : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            Test Analysis ({testAnalysis.testFilesFound.length} files)
          </button>

          {recommendations && recommendations.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('recommendations')}
              className={`px-4 py-2.5 font-semibold border-b-2 transition-colors cursor-pointer shrink-0 ${
                activeTab === 'recommendations'
                  ? 'border-[#58a6ff] text-[#58a6ff]'
                  : 'border-transparent text-[#8b949e] hover:text-[#e6edf3]'
              }`}
            >
              Recommendations ({recommendations.length})
            </button>
          )}
        </div>

        {/* TAB 1: Claim Findings */}
        {activeTab === 'findings' && (
          <div className="space-y-6">
            {/* Search and Filter Info */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="w-4 h-4 text-[#8b949e] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter findings by claim, summary, or file path..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono text-[#e6edf3] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div className="text-xs text-[#8b949e] font-mono">
                Showing {filteredFindings.length} of {findings.length} findings
              </div>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#161b22] border border-[#30363d]">
                <SearchIcon className="w-6 h-6 text-[#8b949e] mx-auto mb-2" />
                <p className="text-sm text-[#8b949e]">
                  No findings match the current filter or search criteria.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLabelFilter(null);
                    setSearchQuery('');
                  }}
                  className="mt-3 px-3 py-1.5 rounded text-xs font-mono bg-[#21262d] text-[#58a6ff] border border-[#30363d] hover:bg-[#30363d]"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredFindings.map((finding: ClaimFinding, idx: number) => (
                  <div
                    key={finding.claimId || idx}
                    className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden shadow-lg"
                  >
                    {/* Card Header */}
                    <div className="p-5 border-b border-[#30363d]/70 bg-[#161b22]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AuditLabelBadge label={finding.label} size="md" />
                          <ConfidenceBadge confidence={finding.confidence} />
                          <span className="text-xs font-mono text-[#8b949e]">
                            ID: {finding.claimId}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-[#e6edf3] leading-snug">
                        &ldquo;{finding.claimText}&rdquo;
                      </h3>

                      <p className="mt-2.5 text-xs sm:text-sm text-[#8b949e] leading-relaxed">
                        {finding.summary}
                      </p>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-5 bg-[#0d1117]/30">
                      {/* Evidence Citations */}
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#58a6ff] uppercase tracking-wider mb-2">
                          <CodeIcon className="w-3.5 h-3.5" />
                          <span>Code Citations &amp; Evidence ({finding.evidence?.length || 0})</span>
                        </div>

                        {finding.evidence && finding.evidence.length > 0 ? (
                          <div className="space-y-3">
                            {finding.evidence.map((ev, evIdx) => (
                              <CodeBlock
                                key={evIdx}
                                filePath={ev.filePath}
                                startLine={ev.startLine}
                                endLine={ev.endLine}
                                snippet={ev.snippet}
                                snippetPurpose={ev.snippetPurpose}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] text-xs text-[#8b949e] italic">
                            No direct code citations were identified for this claim in the inspected files.
                          </div>
                        )}
                      </div>

                      {/* Implementation & Test Signals */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Implementation Signals */}
                        {finding.implementationSignals && finding.implementationSignals.length > 0 && (
                          <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
                            <h4 className="text-xs font-mono font-semibold text-[#e6edf3] uppercase mb-2 flex items-center gap-1.5">
                              <TerminalIcon className="w-3.5 h-3.5 text-[#58a6ff]" />
                              <span>Implementation Signals</span>
                            </h4>
                            <ul className="space-y-2 text-xs">
                              {finding.implementationSignals.map((sig, sIdx) => (
                                <li key={sIdx} className="text-[#8b949e]">
                                  <span className="font-mono text-[#58a6ff] font-medium">
                                    {sig.signal}
                                  </span>{' '}
                                  <span className="text-[#e6edf3]">({sig.filePath})</span>: {sig.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Test Signals */}
                        {finding.testSignals && finding.testSignals.length > 0 && (
                          <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
                            <h4 className="text-xs font-mono font-semibold text-[#e6edf3] uppercase mb-2 flex items-center gap-1.5">
                              <CheckCircleIcon className="w-3.5 h-3.5 text-[#3fb950]" />
                              <span>Test Suite Signals</span>
                            </h4>
                            <ul className="space-y-2 text-xs">
                              {finding.testSignals.map((ts, tIdx) => (
                                <li key={tIdx} className="text-[#8b949e]">
                                  <span className="font-mono text-[#3fb950] font-medium">
                                    {ts.signal}
                                  </span>{' '}
                                  <span className="text-[#e6edf3]">({ts.filePath})</span>: {ts.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Limitations and Recommended Checks */}
                      {(finding.limitations?.length > 0 || finding.recommendedChecks?.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {finding.limitations && finding.limitations.length > 0 && (
                            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
                              <h4 className="text-xs font-mono font-semibold text-[#d29922] uppercase mb-2 flex items-center gap-1.5">
                                <AlertTriangleIcon className="w-3.5 h-3.5 text-[#d29922]" />
                                <span>Verification Limitations</span>
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-xs text-[#8b949e]">
                                {finding.limitations.map((lim, lIdx) => (
                                  <li key={lIdx}>{lim}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {finding.recommendedChecks && finding.recommendedChecks.length > 0 && (
                            <div className="p-3.5 rounded-lg bg-[#161b22] border border-[#30363d]">
                              <h4 className="text-xs font-mono font-semibold text-[#58a6ff] uppercase mb-2 flex items-center gap-1.5">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-[#58a6ff]" />
                                <span>Recommended Checks</span>
                              </h4>
                              <ul className="space-y-1 text-xs text-[#8b949e]">
                                {finding.recommendedChecks.map((rc, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-2">
                                    <span className="text-[#58a6ff] font-mono select-none">&bull;</span>
                                    <span>{rc}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Code Quality Signals */}
        {activeTab === 'quality' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
              <h3 className="text-base font-bold text-[#e6edf3] mb-1">Code Quality Signals</h3>
              <p className="text-xs text-[#8b949e]">
                Static observations regarding code patterns, structure, error handling, or architecture.
              </p>
            </div>

            <div className="space-y-3">
              {codeQualitySignals.map((signal, sIdx) => (
                <div
                  key={sIdx}
                  className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] flex items-start gap-3"
                >
                  <SeverityBadge severity={signal.severity} className="mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm text-[#e6edf3]">{signal.type}</span>
                      <span className="font-mono text-xs text-[#58a6ff] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                        {signal.filePath}
                        {signal.startLine ? `:${signal.startLine}${signal.endLine ? `-${signal.endLine}` : ''}` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-[#8b949e] leading-relaxed">{signal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Security Signals */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
              <h3 className="text-base font-bold text-[#e6edf3] mb-1">Security Signals</h3>
              <p className="text-xs text-[#8b949e]">
                Static indicators of potential security patterns, sensitive APIs, or dependency configurations.
              </p>
            </div>

            <div className="space-y-3">
              {securitySignals.map((sec, secIdx) => (
                <div
                  key={secIdx}
                  className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={sec.severity} />
                      <span className="font-bold text-sm text-[#e6edf3]">{sec.type}</span>
                    </div>
                    <span className="font-mono text-xs text-[#58a6ff] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                      {sec.filePath}
                      {sec.startLine ? `:${sec.startLine}${sec.endLine ? `-${sec.endLine}` : ''}` : ''}
                    </span>
                  </div>

                  <p className="text-xs text-[#8b949e] leading-relaxed">{sec.description}</p>

                  {sec.recommendation && (
                    <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs">
                      <span className="text-[#3fb950] font-mono font-semibold uppercase">Recommendation: </span>
                      <span className="text-[#e6edf3]">{sec.recommendation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Test Analysis */}
        {activeTab === 'tests' && (
          <div className="space-y-6">
            <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#e6edf3] mb-1">Test Suite &amp; Verification Environment</h3>
                <p className="text-xs text-[#8b949e]">
                  Analysis of test harnesses, runner frameworks, and test suite presence.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <div className="text-xs text-[#8b949e] font-mono mb-1">Detected Test Framework</div>
                  <div className="text-sm font-semibold text-[#58a6ff]">
                    {testAnalysis.testFrameworkDetected || 'None detected in manifests'}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d]">
                  <div className="text-xs text-[#8b949e] font-mono mb-1">Identified Test Files</div>
                  <div className="text-sm font-semibold text-[#3fb950] font-mono">
                    {testAnalysis.testFilesFound.length} test files located
                  </div>
                </div>
              </div>

              {testAnalysis.coverageNotes && testAnalysis.coverageNotes.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono font-semibold text-[#e6edf3] uppercase mb-2">Coverage Notes</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-[#8b949e]">
                    {testAnalysis.coverageNotes.map((note, nIdx) => (
                      <li key={nIdx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {testAnalysis.testFilesFound.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono font-semibold text-[#e6edf3] uppercase mb-2">
                    Indexed Test Files ({testAnalysis.testFilesFound.length})
                  </h4>
                  <div className="max-h-60 overflow-y-auto rounded-lg bg-[#0d1117] border border-[#30363d] p-3 text-xs font-mono text-[#8b949e] space-y-1">
                    {testAnalysis.testFilesFound.map((tf, tIdx) => (
                      <div key={tIdx} className="hover:text-[#e6edf3] flex items-center gap-2">
                        <FileCodeIcon className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
                        <span className="truncate">{tf}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: Recommendations */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
              <h3 className="text-base font-bold text-[#e6edf3] mb-1">Actionable Recommendations</h3>
              <p className="text-xs text-[#8b949e]">
                Concrete suggestions grounded in codebase analysis, prioritized by operational relevance.
              </p>
            </div>

            <div className="space-y-4">
              {recommendations.map((rec, rIdx) => (
                <div
                  key={rIdx}
                  className="rounded-xl bg-[#161b22] border border-[#30363d] p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={rec.priority} />
                      <span className="font-bold text-sm text-[#e6edf3]">
                        {rec.observation}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#58a6ff] bg-[#21262d] px-2 py-0.5 rounded border border-[#30363d]">
                      {rec.filePath}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                      <div className="text-[11px] font-mono text-[#8b949e] uppercase mb-1">Why</div>
                      <div className="text-[#e6edf3] leading-relaxed">{rec.why}</div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                      <div className="text-[11px] font-mono text-[#8b949e] uppercase mb-1">Uncertainty / Context</div>
                      <div className="text-[#8b949e] leading-relaxed">{rec.uncertainty}</div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#238636]/10 border border-[#2ea043]/30 text-xs">
                    <span className="text-[#3fb950] font-mono font-semibold uppercase">Recommended Next Step: </span>
                    <span className="text-[#e6edf3]">{rec.nextStep}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limitations & Disclaimer Card */}
        <div className="rounded-xl bg-[#161b22] border border-[#30363d] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#e6edf3]">
            <ShieldIcon className="w-4 h-4 text-[#58a6ff]" />
            <span>Limitations &amp; Disclaimer</span>
          </div>

          {limitations && limitations.length > 0 && (
            <div>
              <h4 className="text-xs font-mono font-semibold text-[#8b949e] uppercase mb-2">
                Scan Limitations
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#8b949e]">
                {limitations.map((lim, lIdx) => (
                  <li key={lIdx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="p-4 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-[#8b949e] leading-relaxed">
            <span className="font-semibold text-[#e6edf3] block mb-1">Disclaimer:</span>
            {disclaimer ||
              'RepoReality performs automated static analysis only. It does not execute repository code, benchmark runtimes, or evaluate network conditions. Audit verdicts do not constitute a formal security audit, warranty, or endorsement.'}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#30363d]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-semibold text-[#e6edf3] border border-[#30363d] transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Start New Audit</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="px-3.5 py-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              <span>Download Markdown Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
