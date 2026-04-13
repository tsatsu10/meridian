import { useState, useCallback, useRef } from 'react';

export interface UseModalOptions {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface UseModalReturn {
  open: boolean;
  setOpen: (open: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
  modalRef: React.RefObject<HTMLDivElement>;
}

export function useModal(options: UseModalOptions = {}): UseModalReturn {
  const {
    defaultOpen = false,
    onOpenChange,
    onOpen,
    onClose,
  } = options;

  const [open, setOpenState] = useState(defaultOpen);
  const modalRef = useRef<HTMLDivElement>(null);

  const setOpen = useCallback((newOpen: boolean) => {
    setOpenState(newOpen);
    onOpenChange?.(newOpen);
    
    if (newOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [onOpenChange, onOpen, onClose]);

  const openModal = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const toggleModal = useCallback(() => {
    setOpen(!open);
  }, [setOpen, open]);

  return {
    open,
    setOpen,
    openModal,
    closeModal,
    toggleModal,
    modalRef,
  };
} 