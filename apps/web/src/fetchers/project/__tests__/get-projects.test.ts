import { describe, it, expect, beforeEach, vi } from 'vitest';
import getProjects from '../get-projects';

// Mock the client
vi.mock('@meridian/libs', () => ({
  client: {
    project: {
      $get: vi.fn(),
    },
  },
}));

import { client } from '@meridian/libs';

describe('getProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear console spies
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should fetch projects successfully', async () => {
    const mockProjects = [
      { id: 'proj-1', name: 'Project 1', workspaceId: 'workspace-123' },
      { id: 'proj-2', name: 'Project 2', workspaceId: 'workspace-123' },
    ];

    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockProjects,
    });

    (client.project.$get as any) = mockGet;

    const result = await getProjects({ workspaceId: 'workspace-123' });

    expect(mockGet).toHaveBeenCalledWith({
      query: { workspaceId: 'workspace-123' },
    });

    expect(result).toEqual(mockProjects);
  });

  it('should handle paginated response format', async () => {
    const mockPaginatedResponse = {
      projects: [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' },
      ],
      pagination: {
        total: 10,
        limit: 2,
        offset: 0,
      },
    };

    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPaginatedResponse,
    });

    (client.project.$get as any) = mockGet;

    const result = await getProjects({ workspaceId: 'workspace-123' });

    expect(result).toEqual(mockPaginatedResponse);
  });

  it('should include limit parameter', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({ workspaceId: 'workspace-123', limit: 10 });

    expect(mockGet).toHaveBeenCalledWith({
      query: {
        workspaceId: 'workspace-123',
        limit: '10',
      },
    });
  });

  it('should include offset parameter', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({ workspaceId: 'workspace-123', offset: 20 });

    expect(mockGet).toHaveBeenCalledWith({
      query: {
        workspaceId: 'workspace-123',
        offset: '20',
      },
    });
  });

  it('should include limit and offset together', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({
      workspaceId: 'workspace-123',
      limit: 5,
      offset: 10
    });

    expect(mockGet).toHaveBeenCalledWith({
      query: {
        workspaceId: 'workspace-123',
        limit: '5',
        offset: '10',
      },
    });
  });

  it('should include includeArchived parameter', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({
      workspaceId: 'workspace-123',
      includeArchived: true
    });

    expect(mockGet).toHaveBeenCalledWith({
      query: {
        workspaceId: 'workspace-123',
        includeArchived: 'true',
      },
    });
  });

  it('should include archivedOnly parameter', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({
      workspaceId: 'workspace-123',
      archivedOnly: true
    });

    expect(mockGet).toHaveBeenCalledWith({
      query: {
        workspaceId: 'workspace-123',
        archivedOnly: 'true',
      },
    });
  });

  it('should return empty array when workspaceId is not provided', async () => {
    const result = await getProjects({ workspaceId: '' });

    expect(result).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith('⚠️ No workspaceId provided to getProjects');
  });

  it('should return empty array when workspaceId is undefined', async () => {
    const result = await getProjects({ workspaceId: undefined as any });

    expect(result).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith('⚠️ No workspaceId provided to getProjects');
  });

  it('should throw error when response is not ok', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Failed to fetch projects: Workspace not found',
    });

    (client.project.$get as any) = mockGet;

    await expect(
      getProjects({ workspaceId: 'invalid-workspace' })
    ).rejects.toThrow('Failed to fetch projects: Workspace not found');

    expect(console.error).toHaveBeenCalledWith(
      '❌ API Error:',
      'Failed to fetch projects: Workspace not found'
    );
  });

  it('should handle empty project list', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    const result = await getProjects({ workspaceId: 'workspace-123' });

    expect(result).toEqual([]);
  });

  it('should handle non-array response by returning empty array', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => null,
    });

    (client.project.$get as any) = mockGet;

    const result = await getProjects({ workspaceId: 'workspace-123' });

    expect(result).toEqual([]);
  });

  it('should convert limit to string', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({ workspaceId: 'workspace-123', limit: 25 });

    const call = mockGet.mock.calls[0][0];
    expect(typeof call.query.limit).toBe('string');
    expect(call.query.limit).toBe('25');
  });

  it('should convert offset to string', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({ workspaceId: 'workspace-123', offset: 100 });

    const call = mockGet.mock.calls[0][0];
    expect(typeof call.query.offset).toBe('string');
    expect(call.query.offset).toBe('100');
  });

  it('should not include undefined parameters in query', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    (client.project.$get as any) = mockGet;

    await getProjects({
      workspaceId: 'workspace-123',
      limit: undefined,
      offset: undefined,
    });

    const call = mockGet.mock.calls[0][0];
    expect(call.query).toEqual({ workspaceId: 'workspace-123' });
    expect(call.query.limit).toBeUndefined();
    expect(call.query.offset).toBeUndefined();
  });

  it('should handle all optional parameters together', async () => {
    const mockGet = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        projects: [],
        pagination: { total: 0, limit: 10, offset: 0 },
      }),
    });

    (client.project.$get as any) = mockGet;

    await getProjects({
      workspaceId: 'workspace-123',
      limit: 10,
      offset: 0,
      includeArchived: false,
      archivedOnly: false,
    });

    expect(mockGet).toHaveBeenCalledWith({
      query: {
        workspaceId: 'workspace-123',
        limit: '10',
        offset: '0',
        includeArchived: 'false',
        archivedOnly: 'false',
      },
    });
  });
});
