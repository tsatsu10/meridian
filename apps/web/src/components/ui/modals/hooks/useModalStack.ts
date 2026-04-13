import { useState, useCallback, useRef } from 'react';

export interface ModalStackItem {
  id: string;
  component: React.ComponentType<any>;
  props: Record<string, any>;
  priority?: number;
}

export interface UseModalStackOptions {
  maxModals?: number;
  onStackChange?: (stack: ModalStackItem[]) => void;
}

export interface UseModalStackReturn {
  stack: ModalStackItem[];
  pushModal: (modal: ModalStackItem) => void;
  popModal: () => void;
  removeModal: (id: string) => void;
  clearStack: () => void;
  getTopModal: () => ModalStackItem | null;
  isStackEmpty: boolean;
  stackLength: number;
}

export function useModalStack(options: UseModalStackOptions = {}): UseModalStackReturn {
  const {
    maxModals = 5,
    onStackChange,
  } = options;

  const [stack, setStack] = useState<ModalStackItem[]>([]);
  const stackRef = useRef<ModalStackItem[]>([]);

  const updateStack = useCallback((newStack: ModalStackItem[]) => {
    setStack(newStack);
    stackRef.current = newStack;
    onStackChange?.(newStack);
  }, [onStackChange]);

  const pushModal = useCallback((modal: ModalStackItem) => {
    setStack(prevStack => {
      if (prevStack.length >= maxModals) {
        console.warn(`Modal stack limit reached (${maxModals}). Removing oldest modal.`);
        const newStack = prevStack.slice(1);
        newStack.push(modal);
        updateStack(newStack);
        return newStack;
      }
      
      const newStack = [...prevStack, modal];
      updateStack(newStack);
      return newStack;
    });
  }, [maxModals, updateStack]);

  const popModal = useCallback(() => {
    setStack(prevStack => {
      if (prevStack.length === 0) return prevStack;
      
      const newStack = prevStack.slice(0, -1);
      updateStack(newStack);
      return newStack;
    });
  }, [updateStack]);

  const removeModal = useCallback((id: string) => {
    setStack(prevStack => {
      const newStack = prevStack.filter(modal => modal.id !== id);
      updateStack(newStack);
      return newStack;
    });
  }, [updateStack]);

  const clearStack = useCallback(() => {
    updateStack([]);
  }, [updateStack]);

  const getTopModal = useCallback(() => {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }, [stack]);

  return {
    stack,
    pushModal,
    popModal,
    removeModal,
    clearStack,
    getTopModal,
    isStackEmpty: stack.length === 0,
    stackLength: stack.length,
  };
} 