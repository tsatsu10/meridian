import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Bulk Operations Store
 * Manages multi-select state, actions, and undo/redo for bulk operations
 * WCAG 2.1 AA compliant with screen reader support
 */

export interface BulkOperationState {
  selectedProjectIds: Set<string>;
  isSelectAll: boolean;
  history: Array<{ projectIds: Set<string>; timestamp: Date }>;
  historyIndex: number;
  operationInProgress: boolean;
  lastOperationResult: any | null;
}

export interface BulkOperationActions {
  // Selection management
  toggleProjectSelection: (projectId: string) => void;
  toggleSelectAll: (projectIds: string[]) => void;
  clearSelection: () => void;
  setSelectedProjects: (projectIds: string[]) => void;

  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Operation management
  startOperation: () => void;
  endOperation: (result: any) => void;
  getSelectedCount: () => number;
  isProjectSelected: (projectId: string) => boolean;
}

type BulkOperationsStore = BulkOperationState & BulkOperationActions;

/**
 * Zustand store for bulk operations
 * Persists selection state to localStorage
 */
export const useBulkOperationsStore = create<BulkOperationsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedProjectIds: new Set<string>(),
      isSelectAll: false,
      history: [{ projectIds: new Set<string>(), timestamp: new Date() }],
      historyIndex: 0,
      operationInProgress: false,
      lastOperationResult: null,

      // Toggle single project selection
      toggleProjectSelection: (projectId: string) => {
        set((state) => {
          const newSelected = new Set(state.selectedProjectIds);
          if (newSelected.has(projectId)) {
            newSelected.delete(projectId);
          } else {
            newSelected.add(projectId);
          }

          // Create history entry
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({
            projectIds: newSelected,
            timestamp: new Date(),
          });

          return {
            selectedProjectIds: newSelected,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isSelectAll: false,
          };
        });
      },

      // Toggle select all
      toggleSelectAll: (projectIds: string[]) => {
        set((state) => {
          const allSelected =
            state.selectedProjectIds.size === projectIds.length &&
            projectIds.every((id) => state.selectedProjectIds.has(id));

          const newSelected = allSelected ? new Set<string>() : new Set(projectIds);

          // Create history entry
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({
            projectIds: newSelected,
            timestamp: new Date(),
          });

          return {
            selectedProjectIds: newSelected,
            isSelectAll: !allSelected,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      // Clear all selections
      clearSelection: () => {
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({
            projectIds: new Set<string>(),
            timestamp: new Date(),
          });

          return {
            selectedProjectIds: new Set<string>(),
            isSelectAll: false,
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      // Set selected projects (e.g., from API response)
      setSelectedProjects: (projectIds: string[]) => {
        set((state) => {
          const newSelected = new Set(projectIds);

          // Create history entry
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push({
            projectIds: newSelected,
            timestamp: new Date(),
          });

          return {
            selectedProjectIds: newSelected,
            history: newHistory,
            historyIndex: newHistory.length - 1,
            isSelectAll: false,
          };
        });
      },

      // Undo last selection change
      undo: () => {
        set((state) => {
          if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            const previousState = state.history[newIndex];

            // Announce undo to screen readers
            const announcement = document.createElement("div");
            announcement.setAttribute("role", "status");
            announcement.setAttribute("aria-live", "polite");
            announcement.className = "sr-only";
            announcement.textContent = `Undo: ${previousState.projectIds.size} projects selected`;
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 1000);

            return {
              selectedProjectIds: previousState.projectIds,
              historyIndex: newIndex,
              isSelectAll: false,
            };
          }
          return state;
        });
      },

      // Redo last undone selection change
      redo: () => {
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1;
            const nextState = state.history[newIndex];

            // Announce redo to screen readers
            const announcement = document.createElement("div");
            announcement.setAttribute("role", "status");
            announcement.setAttribute("aria-live", "polite");
            announcement.className = "sr-only";
            announcement.textContent = `Redo: ${nextState.projectIds.size} projects selected`;
            document.body.appendChild(announcement);
            setTimeout(() => announcement.remove(), 1000);

            return {
              selectedProjectIds: nextState.projectIds,
              historyIndex: newIndex,
              isSelectAll: false,
            };
          }
          return state;
        });
      },

      // Check if undo is available
      canUndo: () => {
        return get().historyIndex > 0;
      },

      // Check if redo is available
      canRedo: () => {
        return get().historyIndex < get().history.length - 1;
      },

      // Start bulk operation (disable UI)
      startOperation: () => {
        set({ operationInProgress: true });
      },

      // End bulk operation (enable UI)
      endOperation: (result: any) => {
        set({ operationInProgress: false, lastOperationResult: result });

        // Announce operation result to screen readers
        const announcement = document.createElement("div");
        announcement.setAttribute("role", "status");
        announcement.setAttribute("aria-live", "assertive");
        announcement.setAttribute("aria-atomic", "true");
        announcement.className = "sr-only";

        if (result.success) {
          announcement.textContent = `Operation completed successfully. ${result.count} projects updated.`;
        } else {
          announcement.textContent = `Operation failed. ${result.error || "Please try again."}`;
        }

        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 3000);
      },

      // Get number of selected projects
      getSelectedCount: () => {
        return get().selectedProjectIds.size;
      },

      // Check if project is selected
      isProjectSelected: (projectId: string) => {
        return get().selectedProjectIds.has(projectId);
      },
    }),
    {
      name: "bulk-operations-store",
      storage: {
        getItem: (name) => {
          const item = localStorage.getItem(name);
          if (!item) return null;

          try {
            const parsed = JSON.parse(item);
            return {
              state: {
                ...parsed.state,
                // Convert stored array back to Set
                selectedProjectIds: new Set(parsed.state.selectedProjectIds || []),
                history: parsed.state.history.map((h: any) => ({
                  ...h,
                  projectIds: new Set(h.projectIds || []),
                })),
              },
              version: parsed.version,
            };
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const serializable = {
              ...value,
              state: {
                ...value.state,
                // Convert Set to array for storage
                selectedProjectIds: Array.from(value.state.selectedProjectIds || []),
                history: value.state.history.map((h: any) => ({
                  ...h,
                  projectIds: Array.from(h.projectIds || []),
                })),
              },
            };
            localStorage.setItem(name, JSON.stringify(serializable));
          } catch {
            console.error("Failed to persist bulk operations state");
          }
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
        },
      },
      merge: (persistedState, currentState) => {
        // Merge persisted state with current state, handling Set conversion
        if (persistedState && typeof persistedState === "object" && "selectedProjectIds" in persistedState) {
          return {
            ...currentState,
            ...persistedState,
            selectedProjectIds: new Set(
              Array.isArray((persistedState as any).selectedProjectIds)
                ? (persistedState as any).selectedProjectIds
                : []
            ),
          };
        }
        return currentState;
      },
    }
  )
);

/**
 * Hook to safely get selected IDs as array
 */
export function useSelectedProjectIds(): string[] {
  const selectedProjectIds = useBulkOperationsStore((state) => state.selectedProjectIds);
  return Array.from(selectedProjectIds);
}

/**
 * Hook to get bulk operations stats
 */
export function useBulkOperationsStats() {
  const selectedCount = useBulkOperationsStore((state) => state.selectedProjectIds.size);
  const operationInProgress = useBulkOperationsStore((state) => state.operationInProgress);
  const canUndo = useBulkOperationsStore((state) => state.canUndo());
  const canRedo = useBulkOperationsStore((state) => state.canRedo());

  return {
    selectedCount,
    operationInProgress,
    canUndo,
    canRedo,
  };
}
