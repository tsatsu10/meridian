import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook to provide undo functionality for delete operations
 * Delays the actual delete to give users time to undo
 */

interface UndoOptions {
  /**
   * Delay in milliseconds before executing the actual delete
   * @default 5000
   */
  delay?: number;
  
  /**
   * Custom undo message
   */
  message?: string;
}

interface UndoState<T> {
  item: T;
  timeoutId: NodeJS.Timeout;
  deleteId: string;
}

/**
 * Hook for managing undo functionality
 * @param deleteFn - Function to call when delete is confirmed (not undone)
 * @param options - Configuration options
 */
export function useUndo<T extends { id: string }>(
  deleteFn: (id: string) => Promise<void>,
  options: UndoOptions = {}
) {
  const { delay = 5000, message = 'Item deleted' } = options;
  const [pendingDeletes, setPendingDeletes] = useState<Map<string, UndoState<T>>>(new Map());
  const toastIds = useRef<Map<string, string | number>>(new Map());

  /**
   * Initiates a delete operation with undo capability
   * @param item - The item to delete
   */
  const deleteWithUndo = useCallback((item: T) => {
    const deleteId = item.id;

    // Clear any existing timeout for this item
    const existing = pendingDeletes.get(deleteId);
    if (existing) {
      clearTimeout(existing.timeoutId);
    }

    // Set up the delayed delete
    const timeoutId = setTimeout(async () => {
      try {
        await deleteFn(deleteId);
        setPendingDeletes(prev => {
          const newMap = new Map(prev);
          newMap.delete(deleteId);
          return newMap;
        });
        toastIds.current.delete(deleteId);
      } catch (error) {
        console.error('Delete failed:', error);
        setPendingDeletes(prev => {
          const newMap = new Map(prev);
          newMap.delete(deleteId);
          return newMap;
        });
        toastIds.current.delete(deleteId);
        toast.error('Failed to delete item');
      }
    }, delay);

    // Store the pending delete
    setPendingDeletes(prev => {
      const newMap = new Map(prev);
      newMap.set(deleteId, { item, timeoutId, deleteId });
      return newMap;
    });

    // Show toast with undo button
    const toastId = toast.success(message, {
      duration: delay,
      action: {
        label: 'Undo',
        onClick: () => {
          undoDelete(deleteId);
        },
      },
    });

    toastIds.current.set(deleteId, toastId);

    return deleteId;
  }, [deleteFn, delay, message, pendingDeletes]);

  /**
   * Undoes a pending delete operation
   * @param deleteId - ID of the delete to undo
   */
  const undoDelete = useCallback((deleteId: string) => {
    const pending = pendingDeletes.get(deleteId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      setPendingDeletes(prev => {
        const newMap = new Map(prev);
        newMap.delete(deleteId);
        return newMap;
      });

      // Dismiss the toast
      const toastId = toastIds.current.get(deleteId);
      if (toastId) {
        toast.dismiss(toastId);
        toastIds.current.delete(deleteId);
      }

      toast.info('Delete cancelled');
      return pending.item;
    }
    return null;
  }, [pendingDeletes]);

  /**
   * Checks if an item is pending deletion
   * @param itemId - ID of the item to check
   */
  const isPendingDelete = useCallback((itemId: string): boolean => {
    return pendingDeletes.has(itemId);
  }, [pendingDeletes]);

  /**
   * Cancels all pending deletes
   */
  const cancelAllDeletes = useCallback(() => {
    pendingDeletes.forEach((pending) => {
      clearTimeout(pending.timeoutId);
      const toastId = toastIds.current.get(pending.deleteId);
      if (toastId) {
        toast.dismiss(toastId);
      }
    });
    setPendingDeletes(new Map());
    toastIds.current.clear();
  }, [pendingDeletes]);

  return {
    deleteWithUndo,
    undoDelete,
    isPendingDelete,
    cancelAllDeletes,
    pendingCount: pendingDeletes.size,
  };
}

export default useUndo;

