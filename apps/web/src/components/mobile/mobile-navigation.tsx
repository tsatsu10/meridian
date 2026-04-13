/**
 * Mobile Navigation Component
 * Bottom tab bar navigation for mobile devices
 * Phase 2.4 - Mobile Optimization
 */

import React from 'react';
import { useIsMobile } from '../../hooks/use-responsive';
import { useHapticFeedback } from '../../hooks/use-touch';

interface NavItem {
  icon: string;
  label: string;
  path: string;
  badge?: number;
}

interface MobileNavigationProps {
  items: NavItem[];
  activePath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  items,
  activePath,
  onNavigate,
  className = '',
}) => {
  const isMobile = useIsMobile();
  const haptic = useHapticFeedback();

  if (!isMobile) return null;

  const handleNavigate = (path: string) => {
    haptic.light();
    onNavigate(path);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe ${className}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = activePath === item.path;

                        return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 active:text-blue-500'
              }`}
            >
              <div className="relative">
                <span className="text-2xl">{item.icon}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                              </span>
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </button>
            );
          })}
      </div>
    </nav>
  );
};

export default MobileNavigation;
