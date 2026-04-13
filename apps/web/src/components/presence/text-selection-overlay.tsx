// @epic-2.2-realtime: Text selection overlay for collaborative text editing
import { useEffect, useState } from 'react';
import { usePresence } from '@/hooks/usePresence';
import type { SelectionHighlight } from '@/hooks/usePresence';

interface TextSelectionOverlayProps {
  className?: string;
}

export function TextSelectionOverlay({ className = '' }: TextSelectionOverlayProps) {
  const { isConnected, selections, updateSelection } = usePresence();

  // Track text selections from other users
  useEffect(() => {
    if (!isConnected) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      
      if (selectedText.trim().length === 0) return;

      // Find the closest element with an ID for anchoring
      let element: Node | null = range.commonAncestorContainer;
      while (element && element.nodeType !== Node.ELEMENT_NODE) {
        element = element.parentNode;
      }
      
      const elementWithId = (element as Element)?.closest('[data-selection-id]') || 
                           (element as Element)?.closest('[id]');
      
      if (!elementWithId) return;

      const elementId = elementWithId.getAttribute('data-selection-id') || 
                       elementWithId.getAttribute('id') || 
                       'unknown';

      // Calculate selection offsets relative to the element
      const elementRange = document.createRange();
      elementRange.selectNodeContents(elementWithId);
      
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;

      // Create selection highlight data
      const selectionData = {
        elementId,
        startOffset,
        endOffset,
        selectedText
      };

      // Send selection to other users via WebSocket
      updateSelection(selectionData);

      // Only log in development mode and limit frequency
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {}
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isConnected, updateSelection]);

  // Render selection highlights from other users
  const renderSelectionHighlights = () => {
    return Array.from(selections.values()).map((selection) => {
      const element = document.querySelector(`[data-selection-id="${selection.elementId}"], #${selection.elementId}`);
      if (!element) return null;

      // Create highlight overlay for the selected text
      const elementRect = element.getBoundingClientRect();
      
      return (
        <div
          key={selection.id}
          className="absolute pointer-events-none z-40"
          style={{
            left: `${elementRect.left}px`,
            top: `${elementRect.top}px`,
            width: `${elementRect.width}px`,
            height: `${elementRect.height}px`,
          }}
        >
          <div 
            className={`absolute rounded-sm opacity-30 ${selection.color}`}
            style={{
              // This would need more sophisticated text range highlighting
              // For now, we'll show a simple overlay
              left: '0px',
              top: '0px',
              width: '100%',
              height: '100%',
            }}
          />
          <div className={`absolute -top-6 left-0 px-2 py-1 rounded text-xs text-white ${selection.color.replace('bg-', 'bg-')} shadow-lg whitespace-nowrap`}>
            {selection.userName} selected text
          </div>
        </div>
      );
    });
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none z-40 ${className}`}>
      {renderSelectionHighlights()}
    </div>
  );
}

// Hook for tracking text selections in specific elements
export function useTextSelectionTracking(elementRef: React.RefObject<HTMLElement>, elementId: string) {
  const { isConnected, updateSelection } = usePresence();

  useEffect(() => {
    if (!isConnected || !elementRef.current) return;

    const element = elementRef.current;
    
    // Add selection tracking attribute
    element.setAttribute('data-selection-id', elementId);

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      // Check if selection is within our tracked element
      const range = selection.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return;

      const selectedText = selection.toString().trim();
      if (selectedText.length === 0) return;

      // Calculate selection position relative to element
      const elementRange = document.createRange();
      elementRange.selectNodeContents(element);
      
      const preRange = document.createRange();
      preRange.setStart(elementRange.startContainer, elementRange.startOffset);
      preRange.setEnd(range.startContainer, range.startOffset);
      
      const startOffset = preRange.toString().length;
      const endOffset = startOffset + selectedText.length;

      // Send selection via WebSocket
      updateSelection({
        elementId,
        startOffset,
        endOffset,
        selectedText
      });

      // Only log in development mode and limit frequency
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {}
    };

    element.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeAttribute('data-selection-id');
    };
  }, [isConnected, elementRef, elementId, updateSelection]);
} 