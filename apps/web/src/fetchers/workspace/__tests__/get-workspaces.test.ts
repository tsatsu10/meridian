import { describe, it, expect, beforeEach, vi } from 'vitest';
import getWorkspaces from '../get-workspaces';

// Mock the constants
vi.mock('@/constants/urls', () => ({
  API_URL: 'http://localhost:3000',
  API_BASE_URL: 'http://localhost:3000/api',
}));

describe('getWorkspaces', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  const mockWorkspaces = [
    {
      id: 'workspace-1',
      name: 'Personal Workspace',
      description: 'My personal workspace',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'workspace-2',
      name: 'Team Workspace',
      description: 'Shared team workspace',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  it('should fetch workspaces successfully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWorkspaces,
    });

    const result = await getWorkspaces();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/workspaces',
      {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    expect(result).toEqual(mockWorkspaces);
  });

  it('should include credentials in request', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getWorkspaces();

    const callOptions = (global.fetch as any).mock.calls[0][1];
    expect(callOptions.credentials).toBe('include');
  });

  it('should set Content-Type header', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getWorkspaces();

    const callOptions = (global.fetch as any).mock.calls[0][1];
    expect(callOptions.headers['Content-Type']).toBe('application/json');
  });

  it('should call correct API endpoint', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getWorkspaces();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/workspaces',
      expect.any(Object)
    );
  });

  it('should return empty array when no workspaces', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await getWorkspaces();

    expect(result).toEqual([]);
  });

  it('should return multiple workspaces', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockWorkspaces,
    });

    const result = await getWorkspaces();

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('workspace-1');
    expect(result[1].id).toBe('workspace-2');
  });

  it('should throw error when response is not ok', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Failed to fetch workspaces',
    });

    await expect(getWorkspaces()).rejects.toThrow('Failed to fetch workspaces');
  });

  it('should handle unauthorized error (401)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Unauthorized: Please log in',
    });

    await expect(getWorkspaces()).rejects.toThrow('Unauthorized: Please log in');
  });

  it('should handle server error (500)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      text: async () => 'Internal server error',
    });

    await expect(getWorkspaces()).rejects.toThrow('Internal server error');
  });

  it('should handle network errors', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(getWorkspaces()).rejects.toThrow('Network error');
  });

  it('should parse JSON response correctly', async () => {
    const workspace = {
      id: 'workspace-1',
      name: 'Test Workspace',
      description: 'Test description',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [workspace],
    });

    const result = await getWorkspaces();

    expect(result[0]).toEqual(workspace);
  });

  it('should handle workspaces with all properties', async () => {
    const detailedWorkspace = {
      id: 'workspace-1',
      name: 'Detailed Workspace',
      description: 'Full details',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      ownerId: 'user-123',
      members: 10,
      projects: 5,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [detailedWorkspace],
    });

    const result = await getWorkspaces();

    expect(result[0].id).toBe('workspace-1');
    expect(result[0].name).toBe('Detailed Workspace');
    expect(result[0].ownerId).toBe('user-123');
    expect(result[0].members).toBe(10);
  });

  it('should be called only once per fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    await getWorkspaces();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle large workspace lists', async () => {
    const largeList = Array.from({ length: 100 }, (_, i) => ({
      id: `workspace-${i}`,
      name: `Workspace ${i}`,
    }));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => largeList,
    });

    const result = await getWorkspaces();

    expect(result).toHaveLength(100);
  });

  it('should handle workspaces with missing optional fields', async () => {
    const minimalWorkspace = {
      id: 'workspace-1',
      name: 'Minimal',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [minimalWorkspace],
    });

    const result = await getWorkspaces();

    expect(result[0].id).toBe('workspace-1');
    expect(result[0].name).toBe('Minimal');
  });
});
