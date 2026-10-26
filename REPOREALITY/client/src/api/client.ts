import type {
  ApiResponse,
  RepositoryInspection,
  ClaimsResponse,
  AuditReport,
  Claim,
  FileTreeEntry,
  ManifestInfo,
} from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Request failed (${response.status})`,
        details: data.details,
      };
    }
    // Handle both { success: true, data: T } and direct T responses
    if (data && typeof data === 'object') {
      if ('success' in data && 'data' in data) {
        return data as ApiResponse<T>;
      }
      if ('success' in data && data.success === true) {
        return { success: true, data: data as unknown as T };
      }
      return { success: true, data: data as unknown as T };
    }
    return { success: true, data: data as unknown as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export const api = {
  health: () => request<{ status: string }>('/health'),

  inspectRepository: (url: string) =>
    request<RepositoryInspection>('/repository/inspect', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),

  extractClaims: (data: {
    url: string;
    readme: string;
    fileTree: FileTreeEntry[] | unknown[];
    manifests: ManifestInfo[] | unknown[];
  }) =>
    request<ClaimsResponse>('/repository/claims', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  analyzeAudit: (data: {
    url: string;
    selectedClaimIds: string[];
    inspection: RepositoryInspection;
    claims: Claim[];
  }) =>
    request<AuditReport>('/audit/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
