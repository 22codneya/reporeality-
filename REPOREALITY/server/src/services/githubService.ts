import { config } from '../config.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RepositoryInfo, FileTreeEntry } from '../validators/schemas.js';

export class GitHubService {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor() {
    this.baseUrl = config.githubApiBaseUrl.replace(/\/$/, '');
    this.token = config.githubToken;
    this.timeoutMs = config.requestTimeoutMs;
  }

  private async fetchGitHub<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'RepoReality-Server/1.0.0',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = `GitHub API request failed with status ${response.status}`;
        try {
          const errorJson = (await response.json()) as { message?: string };
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // Response body was not JSON
        }

        if (response.status === 404) {
          throw new AppError(404, `GitHub resource not found: ${endpoint}`, errorMessage);
        }

        if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
          if (rateLimitRemaining === '0') {
            throw new AppError(
              429,
              'GitHub API rate limit exceeded. Set a GITHUB_TOKEN environment variable to increase limits.',
              errorMessage
            );
          }
          throw new AppError(403, `GitHub API forbidden: ${errorMessage}`, errorMessage);
        }

        throw new AppError(response.status, errorMessage);
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof AppError) {
        throw err;
      }

      if (err instanceof Error && err.name === 'AbortError') {
        throw new AppError(504, `GitHub API request timed out after ${this.timeoutMs}ms for ${endpoint}`);
      }

      const msg = err instanceof Error ? err.message : 'Unknown GitHub API connection error';
      throw new AppError(502, `Failed to communicate with GitHub API: ${msg}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const languages = await this.fetchGitHub<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
      return languages || {};
    } catch (err) {
      console.warn(`[GitHubService] Could not fetch languages for ${owner}/${repo}:`, err);
      return {};
    }
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<RepositoryInfo> {
    interface GitHubRepoPayload {
      name: string;
      full_name: string;
      description: string | null;
      default_branch: string;
      stargazers_count: number;
      forks_count: number;
      html_url: string;
      owner: { login: string };
    }

    const [repoData, languages] = await Promise.all([
      this.fetchGitHub<GitHubRepoPayload>(`/repos/${owner}/${repo}`),
      this.getLanguages(owner, repo),
    ]);

    return {
      owner: repoData.owner?.login || owner,
      repo: repoData.name || repo,
      fullName: repoData.full_name || `${owner}/${repo}`,
      description: repoData.description ?? null,
      defaultBranch: repoData.default_branch || 'main',
      languages,
      stars: repoData.stargazers_count ?? 0,
      forks: repoData.forks_count ?? 0,
      url: repoData.html_url || `https://github.com/${owner}/${repo}`,
    };
  }

  async getReadme(owner: string, repo: string): Promise<string> {
    interface GitHubReadmePayload {
      content: string;
      encoding: string;
    }

    try {
      const readmeData = await this.fetchGitHub<GitHubReadmePayload>(`/repos/${owner}/${repo}/readme`);
      if (readmeData.encoding === 'base64') {
        return Buffer.from(readmeData.content, 'base64').toString('utf-8');
      }
      return readmeData.content || '';
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 404) {
        console.warn(`[GitHubService] No README found for ${owner}/${repo}`);
        return '';
      }
      throw err;
    }
  }

  async getFileTree(
    owner: string,
    repo: string,
    branch: string
  ): Promise<{ entries: FileTreeEntry[]; truncated: boolean }> {
    interface GitHubTreePayload {
      sha: string;
      truncated: boolean;
      tree: Array<{
        path: string;
        type: 'blob' | 'tree';
        size?: number;
        sha: string;
      }>;
    }

    const treeData = await this.fetchGitHub<GitHubTreePayload>(
      `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
    );

    const entries: FileTreeEntry[] = (treeData.tree || [])
      .filter((item) => item.type === 'blob' || item.type === 'tree')
      .map((item) => ({
        path: item.path,
        type: item.type === 'tree' ? ('tree' as const) : ('blob' as const),
        size: item.size,
        sha: item.sha,
      }));

    return {
      entries,
      truncated: Boolean(treeData.truncated),
    };
  }

  async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
    interface GitHubContentPayload {
      content?: string;
      encoding?: string;
      type: string;
    }

    // Clean leading slash if any
    const cleanPath = path.replace(/^\//, '');
    const contentData = await this.fetchGitHub<GitHubContentPayload>(
      `/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}`
    );

    if (contentData.content && contentData.encoding === 'base64') {
      return Buffer.from(contentData.content, 'base64').toString('utf-8');
    }

    return contentData.content || '';
  }
}

export const githubService = new GitHubService();
export default githubService;
