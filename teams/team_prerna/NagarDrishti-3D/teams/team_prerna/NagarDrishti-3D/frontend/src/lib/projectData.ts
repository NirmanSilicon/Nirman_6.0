import { apiFetch } from './api';
import type { ComparisonResult, Project } from '../types/domain';

interface ProjectListResponse {
  projects: Project[];
  mode?: string;
}

interface ProjectLookupsResponse {
  departments: Array<{ id: string; code?: string; name: string }>;
  contractors: Array<{ id: string; name: string }>;
  mode?: string;
}

export function fetchProjects(query = ''): Promise<ProjectListResponse> {
  return apiFetch<ProjectListResponse>(`/projects${query}`);
}

export function fetchProjectLookups(): Promise<ProjectLookupsResponse> {
  return apiFetch<ProjectLookupsResponse>('/projects/meta/lookups');
}

export function fetchProjectDetail(projectId: string) {
  return apiFetch<{
    project: Project;
    sections: [];
    progress_history: [];
    documents: [];
    inspections: [];
    mode?: string;
  }>(`/projects/${projectId}`);
}

export function fetchEvidenceComparisons(projectId?: string): Promise<{
  comparisons: ComparisonResult[];
  mode?: string;
}> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return apiFetch<{ comparisons: ComparisonResult[]; mode?: string }>(`/evidence/comparisons${query}`);
}
