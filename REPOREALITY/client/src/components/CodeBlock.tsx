import React, { useState } from 'react';
import { CopyIcon, CheckIcon, CodeIcon } from './Icons';

interface CodeBlockProps {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
  snippetPurpose?: string;
  className?: string;
}

export function CodeBlock({
  filePath,
  startLine,
  endLine,
  snippet,
  snippetPurpose,
  className = '',
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const rawLines = snippet.split('\n');

  return (
    <div className={`rounded-lg border border-[#30363d] bg-[#0d1117] overflow-hidden my-3 ${className}`}>
      {/* File Path & Action Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-[#30363d] text-xs">
        <div className="flex items-center gap-2 font-mono text-[#e6edf3] min-w-0">
          <CodeIcon className="w-3.5 h-3.5 text-[#58a6ff] shrink-0" />
          <span className="truncate font-medium">{filePath}</span>
          <span className="text-[#8b949e] shrink-0">
            (Lines {startLine}–{endLine})
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code snippet"
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors shrink-0"
        >
          {copied ? (
            <>
              <CheckIcon className="w-3 h-3 text-[#3fb950]" />
              <span className="text-[#3fb950] font-mono">Copied</span>
            </>
          ) : (
            <>
              <CopyIcon className="w-3 h-3" />
              <span className="font-mono">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Optional snippet purpose */}
      {snippetPurpose && (
        <div className="px-3.5 py-1.5 bg-[#161b22]/50 border-b border-[#30363d]/50 text-xs text-[#8b949e] italic flex items-center gap-2">
          <span className="text-[#58a6ff] not-italic font-semibold font-mono text-[11px] uppercase tracking-wider">Purpose:</span>
          <span>{snippetPurpose}</span>
        </div>
      )}

      {/* Code Area with Line Numbers */}
      <div className="overflow-x-auto text-xs font-mono p-3 leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {rawLines.map((line, idx) => {
              const lineNumber = startLine + idx;
              return (
                <tr key={idx} className="hover:bg-[#161b22]/70 group">
                  <td className="pr-4 text-right select-none text-[#484f58] group-hover:text-[#8b949e] w-8 align-top">
                    {lineNumber}
                  </td>
                  <td className="text-[#e6edf3] whitespace-pre font-mono align-top pl-2">
                    {line || ' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
