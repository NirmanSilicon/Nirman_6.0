import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchEvidenceComparisons,
  fetchProjectDetail,
  fetchProjectLookups,
  fetchProjects,
} from '../lib/projectData';

describe('Project API data source', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('propagates unavailable API errors instead of fabricating project or comparison data', async () => {
    await expect(fetchProjects()).rejects.toThrow('Failed to fetch');
    await expect(fetchProjectLookups()).rejects.toThrow('Failed to fetch');
    await expect(fetchProjectDetail('project-id')).rejects.toThrow('Failed to fetch');
    await expect(fetchEvidenceComparisons()).rejects.toThrow('Failed to fetch');
  });
});
