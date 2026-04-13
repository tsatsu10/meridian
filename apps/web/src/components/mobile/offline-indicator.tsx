/**
 * Offline Indicator Component
 * Shows connection status banner
 * Phase 2.4 - Mobile Optimization
 */

import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '../../hooks/use-pwa';

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
}) => {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 animate-slide-down ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className={`px-4 py-3 text-sm font-medium text-center ${
          isOnline
            ? 'bg-green-600 text-white'
            : 'bg-yellow-500 text-gray-900'
        }`}
      >
        <div className="flex items-center justify-center space-x-2">
          <span className="text-lg">
            {isOnline ? '✅' : '📡'}
          </span>
          <span>
            {isOnline
              ? 'Back online! Your changes will sync now.'
              : 'You are offline. Changes will sync when reconnected.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfflineIndicator;

