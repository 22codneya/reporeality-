import React from 'react';
import type { AuditLabel, ConfidenceLevel } from '../types';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  HelpCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
} from './Icons';

interface AuditLabelBadgeProps {
  label: AuditLabel;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AuditLabelBadge({
  label,
  showIcon = true,
  className = '',
  size = 'md',
}: AuditLabelBadgeProps) {
  let badgeStyle = '';
  let labelText = '';
  let IconComponent = CheckCircleIcon;

  switch (label) {
    case 'IMPLEMENTATION_EVIDENCE_FOUND':
      badgeStyle = 'bg-[#238636]/20 text-[#3fb950] border-[#2ea043]/40';
      labelText = 'Evidence Found';
      IconComponent = CheckCircleIcon;
      break;
    case 'PARTIAL_EVIDENCE':
      badgeStyle = 'bg-[#d29922]/20 text-[#d29922] border-[#bb8009]/40';
      labelText = 'Partial Evidence';
      IconComponent = AlertTriangleIcon;
      break;
    case 'NOT_VERIFIED':
      badgeStyle = 'bg-[#30363d]/50 text-[#8b949e] border-[#484f58]/40';
      labelText = 'Not Verified';
      IconComponent = HelpCircleIcon;
      break;
    case 'POTENTIAL_INCONSISTENCY':
      badgeStyle = 'bg-[#f85149]/20 text-[#f85149] border-[#da3633]/40';
      labelText = 'Potential Inconsistency';
      IconComponent = XCircleIcon;
      break;
    case 'NEEDS_RUNTIME_CHECK':
      badgeStyle = 'bg-[#388bfd]/20 text-[#58a6ff] border-[#1f6feb]/40';
      labelText = 'Needs Runtime Check';
      IconComponent = AlertCircleIcon;
      break;
    default:
      badgeStyle = 'bg-[#30363d]/50 text-[#8b949e] border-[#484f58]/40';
      labelText = String(label).replace(/_/g, ' ');
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center border rounded-full font-mono tracking-tight ${sizeClasses} ${badgeStyle} ${className}`}
    >
      {showIcon && <IconComponent className={iconSizes} />}
      <span>{labelText}</span>
    </span>
  );
}

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  let style = '';
  switch (confidence) {
    case 'HIGH':
      style = 'bg-[#238636]/15 text-[#3fb950] border-[#2ea043]/30';
      break;
    case 'MEDIUM':
      style = 'bg-[#d29922]/15 text-[#d29922] border-[#bb8009]/30';
      break;
    case 'LOW':
      style = 'bg-[#f85149]/15 text-[#f85149] border-[#da3633]/30';
      break;
    default:
      style = 'bg-[#30363d] text-[#8b949e] border-[#484f58]';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded border ${style} ${className}`}
    >
      Confidence: {confidence}
    </span>
  );
}

interface CategoryBadgeProps {
  category: string;
  className?: string;
}

export function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-md bg-[#21262d] text-[#8b949e] border border-[#30363d] ${className}`}
    >
      {category}
    </span>
  );
}

interface SeverityBadgeProps {
  severity: 'info' | 'warning' | 'concern' | 'critical';
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  let style = '';
  switch (severity) {
    case 'critical':
      style = 'bg-[#f85149]/20 text-[#f85149] border-[#da3633]/40';
      break;
    case 'concern':
      style = 'bg-[#f85149]/15 text-[#f85149] border-[#da3633]/30';
      break;
    case 'warning':
      style = 'bg-[#d29922]/20 text-[#d29922] border-[#bb8009]/40';
      break;
    case 'info':
      style = 'bg-[#388bfd]/20 text-[#58a6ff] border-[#1f6feb]/40';
      break;
    default:
      style = 'bg-[#30363d] text-[#8b949e] border-[#484f58]';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded uppercase border ${style} ${className}`}
    >
      {severity}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: 'high' | 'medium' | 'low';
  className?: string;
}

export function PriorityBadge({ priority, className = '' }: PriorityBadgeProps) {
  let style = '';
  switch (priority) {
    case 'high':
      style = 'bg-[#f85149]/20 text-[#f85149] border-[#da3633]/40';
      break;
    case 'medium':
      style = 'bg-[#d29922]/20 text-[#d29922] border-[#bb8009]/40';
      break;
    case 'low':
      style = 'bg-[#30363d]/50 text-[#8b949e] border-[#484f58]/40';
      break;
    default:
      style = 'bg-[#30363d] text-[#8b949e] border-[#484f58]';
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded uppercase border ${style} ${className}`}
    >
      {priority} priority
    </span>
  );
}
