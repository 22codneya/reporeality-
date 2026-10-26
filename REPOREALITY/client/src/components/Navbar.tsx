import React from 'react';
import { LogoIcon, GitHubIcon, RefreshCwIcon, ExternalLinkIcon } from './Icons';

interface NavbarProps {
  currentRepo?: string | null;
  onReset?: () => void;
  showReset?: boolean;
}

export function Navbar({ currentRepo, onReset, showReset = false }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#30363d] bg-[#0d1117]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            onClick={onReset}
            className={`flex items-center gap-2.5 ${onReset ? 'cursor-pointer group' : ''}`}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1f6feb] to-[#58a6ff] flex items-center justify-center text-white shadow-lg shadow-[#1f6feb]/20 group-hover:scale-105 transition-transform">
              <LogoIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-[#e6edf3] tracking-tight">RepoReality</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono uppercase bg-[#21262d] text-[#58a6ff] border border-[#30363d] rounded">
                  Gemma 4
                </span>
              </div>
              <p className="text-xs text-[#8b949e] hidden sm:block">
                Verify the claims, not just the README
              </p>
            </div>
          </div>

          {currentRepo && (
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-[#30363d] text-xs font-mono">
              <span className="text-[#8b949e]">Target:</span>
              <a
                href={`https://github.com/${currentRepo}`}
                target="_blank"
                rel="noreferrer"
                className="text-[#58a6ff] hover:underline flex items-center gap-1 font-semibold"
              >
                {currentRepo}
                <ExternalLinkIcon className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Right Nav actions */}
        <div className="flex items-center gap-3">
          {showReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d] transition-colors"
            >
              <RefreshCwIcon className="w-3.5 h-3.5 text-[#8b949e]" />
              <span>New Audit</span>
            </button>
          )}

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-md text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
            aria-label="GitHub"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
