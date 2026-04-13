/**
 * Workspace Store Tests
 * 
 * Tests Zustand workspace store:
 * - Store initialization
 * - State updates
 * - Persistence
 * - Selectors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

interface WorkspaceStore {
  workspace: Workspace | undefined;
  currentWorkspace: Workspace | undefined;
  setWorkspace: (workspace: Workspace | undefined) => void;
}

// Mock workspace store
const createWorkspaceStore = () =>
  create<WorkspaceStore>()(
    persist(
      (set) => ({
        workspace: undefined,
        currentWorkspace: undefined,
        setWorkspace: (updatedWorkspace) =>
          set(() => ({ workspace: updatedWorkspace, currentWorkspace: updatedWorkspace })),
      }),
      {
        name: 'test-workspace-store',
        storage: createJSONStorage(() => ({
          getItem: (name: string) => {
            const item = (globalThis as any).__TEST_STORAGE__?.[name];
            return item || null;
          },
          setItem: (name: string, value: string) => {
            if (!(globalThis as any).__TEST_STORAGE__) {
              (globalThis as any).__TEST_STORAGE__ = {};
            }
            (globalThis as any).__TEST_STORAGE__[name] = value;
          },
          removeItem: (name: string) => {
            delete (globalThis as any).__TEST_STORAGE__?.[name];
          },
        })),
      }
    )
  );

describe('Workspace Store', () => {
  let useWorkspaceStore: ReturnType<typeof createWorkspaceStore>;

  beforeEach(() => {
    // Clear test storage
    (globalThis as any).__TEST_STORAGE__ = {};
    useWorkspaceStore = createWorkspaceStore();
  });

  it('should initialize with undefined workspace', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    expect(result.current.workspace).toBeUndefined();
  });

  it('should set workspace', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    const testWorkspace: Workspace = {
      id: 'workspace-123',
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: 'user-456',
    };

    act(() => {
      result.current.setWorkspace(testWorkspace);
    });

    expect(result.current.workspace).toEqual(testWorkspace);
  });

  it('should provide currentWorkspace alias', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    const testWorkspace: Workspace = {
      id: 'workspace-123',
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: 'user-456',
    };

    act(() => {
      result.current.setWorkspace(testWorkspace);
    });

    expect(result.current.currentWorkspace).toEqual(testWorkspace);
    expect(result.current.currentWorkspace).toEqual(result.current.workspace);
  });

  it('should update workspace', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    const workspace1: Workspace = {
      id: 'workspace-1',
      name: 'Workspace 1',
      slug: 'workspace-1',
      ownerId: 'user-1',
    };

    const workspace2: Workspace = {
      id: 'workspace-2',
      name: 'Workspace 2',
      slug: 'workspace-2',
      ownerId: 'user-1',
    };

    act(() => {
      result.current.setWorkspace(workspace1);
    });

    expect(result.current.workspace).toEqual(workspace1);

    act(() => {
      result.current.setWorkspace(workspace2);
    });

    expect(result.current.workspace).toEqual(workspace2);
  });

  it('should clear workspace', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    const testWorkspace: Workspace = {
      id: 'workspace-123',
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: 'user-456',
    };

    act(() => {
      result.current.setWorkspace(testWorkspace);
    });

    expect(result.current.workspace).toBeDefined();

    act(() => {
      result.current.setWorkspace(undefined);
    });

    expect(result.current.workspace).toBeUndefined();
  });

  it('should persist workspace to storage', () => {
    const { result } = renderHook(() => useWorkspaceStore());

    const testWorkspace: Workspace = {
      id: 'workspace-persist',
      name: 'Persistent Workspace',
      slug: 'persistent',
      ownerId: 'user-789',
    };

    act(() => {
      result.current.setWorkspace(testWorkspace);
    });

    // Check storage
    const stored = (globalThis as any).__TEST_STORAGE__?.['test-workspace-store'];
    expect(stored).toBeDefined();
    
    const parsed = JSON.parse(stored);
    expect(parsed.state.workspace).toEqual(testWorkspace);
  });

  it('should hydrate from storage', () => {
    const testWorkspace: Workspace = {
      id: 'workspace-hydrate',
      name: 'Hydrated Workspace',
      slug: 'hydrated',
      ownerId: 'user-999',
    };

    // Set storage directly
    (globalThis as any).__TEST_STORAGE__ = {
      'test-workspace-store': JSON.stringify({
        state: { workspace: testWorkspace },
        version: 0,
      }),
    };

    // Create new store instance (should hydrate)
    const useNewStore = createWorkspaceStore();
    const { result } = renderHook(() => useNewStore());

    expect(result.current.workspace).toEqual(testWorkspace);
  });

  it('should handle multiple subscribers', () => {
    const { result: result1 } = renderHook(() => useWorkspaceStore());
    const { result: result2 } = renderHook(() => useWorkspaceStore());

    const testWorkspace: Workspace = {
      id: 'workspace-multi',
      name: 'Multi Workspace',
      slug: 'multi',
      ownerId: 'user-multi',
    };

    act(() => {
      result1.current.setWorkspace(testWorkspace);
    });

    // Both hooks should see the same state
    expect(result1.current.workspace).toEqual(testWorkspace);
    expect(result2.current.workspace).toEqual(testWorkspace);
  });
});

