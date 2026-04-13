/**
 * Isolated toast portal that renders outside React's context system
 * This prevents useState context errors in Sonner
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/minimal-toast';
import { logger } from "../lib/logger";

let toastRoot: any = null;

export function initializeToastPortal() {
  // Only initialize once
  if (toastRoot) return;
  
  try {
    // Create a separate container for toasts
    const toastContainer = document.createElement('div');
    toastContainer.id = 'toast-portal';
    toastContainer.style.position = 'fixed';
    toastContainer.style.top = '0';
    toastContainer.style.left = '0';
    toastContainer.style.right = '0';
    toastContainer.style.bottom = '0';
    toastContainer.style.pointerEvents = 'none';
    toastContainer.style.zIndex = '9999';
    
    document.body.appendChild(toastContainer);
    
    // Create React root and render Toaster
    toastRoot = createRoot(toastContainer);
    toastRoot.render(<Toaster />);
    
    logger.info("Toast portal initialized successfully");
  } catch (error) {
    console.warn('Failed to initialize toast portal:', error);
  }
}

export function cleanupToastPortal() {
  if (toastRoot) {
    toastRoot.unmount();
    toastRoot = null;
    
    const container = document.getElementById('toast-portal');
    if (container) {
      document.body.removeChild(container);
    }
  }
}