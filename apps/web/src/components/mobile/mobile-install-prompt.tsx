/**
 * Mobile Install Prompt Component
 * PWA installation banner
 * Phase 2.4 - Mobile Optimization
 */

import React, { useState, useEffect } from 'react';
import { useInstallPrompt, useOnlineStatus } from '../../hooks/use-pwa';

interface MobileInstallPromptProps {
  className?: string;
}

export const MobileInstallPrompt: React.FC<MobileInstallPromptProps> = ({
  className = '',
}) => {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const isOnline = useOnlineStatus();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Check if user has dismissed before
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    const accepted = await promptInstall();
    setIsInstalling(false);
    
    if (accepted) {
      localStorage.setItem('pwa-prompt-dismissed', 'true');
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setIsDismissed(true);
  };

  if (!isInstallable || isInstalled || isDismissed || !isOnline) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-20 left-4 right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-lg shadow-xl z-50 animate-slide-up ${className}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white opacity-70 hover:opacity-100"
        aria-label="Dismiss"
      >
        ✕
      </button>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg flex items-center justify-center text-3xl">
          📱
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-white mb-1">Install Meridian App</h3>
          <p className="text-sm text-white opacity-90 mb-3">
            Get the full experience with offline access, push notifications, and faster loading.
          </p>

          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="w-full px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {isInstalling ? 'Installing...' : 'Install App'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileInstallPrompt;

