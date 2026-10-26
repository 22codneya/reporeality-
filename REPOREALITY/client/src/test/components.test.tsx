import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditLabelBadge, ConfidenceBadge, CategoryBadge, SeverityBadge, PriorityBadge } from '../components/Badge';
import { CodeBlock } from '../components/CodeBlock';

describe('Badge Components', () => {
  it('renders AuditLabelBadge for evidence found', () => {
    render(<AuditLabelBadge label="IMPLEMENTATION_EVIDENCE_FOUND" />);
    expect(screen.getByText('Evidence Found')).toBeInTheDocument();
  });

  it('renders AuditLabelBadge for potential inconsistency', () => {
    render(<AuditLabelBadge label="POTENTIAL_INCONSISTENCY" />);
    expect(screen.getByText('Potential Inconsistency')).toBeInTheDocument();
  });

  it('renders ConfidenceBadge properly', () => {
    render(<ConfidenceBadge confidence="HIGH" />);
    expect(screen.getByText('Confidence: HIGH')).toBeInTheDocument();
  });

  it('renders CategoryBadge properly', () => {
    render(<CategoryBadge category="Performance" />);
    expect(screen.getByText('Performance')).toBeInTheDocument();
  });

  it('renders SeverityBadge properly', () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('renders PriorityBadge properly', () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByText('high priority')).toBeInTheDocument();
  });
});

describe('CodeBlock Component', () => {
  it('renders file path, lines, and snippet lines', () => {
    render(
      <CodeBlock
        filePath="src/main.ts"
        startLine={10}
        endLine={12}
        snippet={'const x = 1;\nconst y = 2;'}
        snippetPurpose="Variable assignment check"
      />
    );

    expect(screen.getByText('src/main.ts')).toBeInTheDocument();
    expect(screen.getByText('(Lines 10–12)')).toBeInTheDocument();
    expect(screen.getByText('Variable assignment check')).toBeInTheDocument();
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });
});
