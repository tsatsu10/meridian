/**
 * Theme Builder Component
 * Visual theme customization interface
 * Phase 2.5 - Enhanced Personalization
 */

import React, { useState } from 'react';
import { useTheme, ColorScheme, ThemeMode } from '../../hooks/use-theme';

interface ThemeBuilderProps {
  onClose?: () => void;
  className?: string;
}

const COLOR_SCHEMES: { value: ColorScheme; label: string; color: string }[] = [
  { value: 'blue', label: 'Blue', color: '#3B82F6' },
  { value: 'purple', label: 'Purple', color: '#9333EA' },
  { value: 'green', label: 'Green', color: '#10B981' },
  { value: 'orange', label: 'Orange', color: '#F59E0B' },
  { value: 'pink', label: 'Pink', color: '#EC4899' },
];

const FONT_OPTIONS = [
  { value: 'system-ui, -apple-system, sans-serif', label: 'System Default' },
  { value: '"Inter", sans-serif', label: 'Inter' },
  { value: '"Roboto", sans-serif', label: 'Roboto' },
  { value: '"Open Sans", sans-serif', label: 'Open Sans' },
  { value: '"Poppins", sans-serif', label: 'Poppins' },
];

export const ThemeBuilder: React.FC<ThemeBuilderProps> = ({
  onClose,
  className = '',
}) => {
  const { theme, resolvedMode, setMode, setColorScheme, setTheme, resetTheme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'effects'>('colors');

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Theme Builder</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Customize your Meridian experience
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['colors', 'typography', 'effects'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Colors Tab */}
        {activeTab === 'colors' && (
          <>
            {/* Theme Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setMode(mode)}
                    className={`p-4 rounded-lg border-2 transition-colors capitalize ${
                      theme.mode === mode
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🔄'}
                    </div>
                    <div className="text-sm font-medium">{mode}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Scheme */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Color Scheme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {COLOR_SCHEMES.map((scheme) => (
                  <button
                    key={scheme.value}
                    onClick={() => setColorScheme(scheme.value)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      theme.colorScheme === scheme.value
                        ? 'border-blue-600 dark:border-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div
                      className="w-full h-8 rounded mb-2"
                      style={{ backgroundColor: scheme.color }}
                    />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {scheme.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Typography Tab */}
        {activeTab === 'typography' && (
          <>
            {/* Font Family */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Font Family
              </label>
              <select
                value={theme.fontFamily || FONT_OPTIONS[0].value}
                onChange={(e) => setTheme({ fontFamily: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['sm', 'base', 'lg'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setTheme({ fontSize: size })}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      theme.fontSize === size
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {size === 'sm' ? 'Small' : size === 'base' ? 'Medium' : 'Large'}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {size === 'sm' ? '14px' : size === 'base' ? '16px' : '18px'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Effects Tab */}
        {activeTab === 'effects' && (
          <>
            {/* Border Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Border Radius
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'sm', 'md', 'lg', 'xl'] as const).map((radius) => (
                  <button
                    key={radius}
                    onClick={() => setTheme({ borderRadius: radius })}
                    className={`p-4 border-2 transition-colors ${
                      theme.borderRadius === radius
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    style={{
                      borderRadius: radius === 'none' ? '0' : radius === 'sm' ? '0.125rem' : radius === 'md' ? '0.375rem' : radius === 'lg' ? '0.5rem' : '0.75rem'
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {radius}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Animation */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
                Animations
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['none', 'reduced', 'normal'] as const).map((anim) => (
                  <button
                    key={anim}
                    onClick={() => setTheme({ animation: anim })}
                    className={`p-4 rounded-lg border-2 transition-colors capitalize ${
                      theme.animation === anim
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {anim}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
        <button
          onClick={resetTheme}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Reset to Default
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

export default ThemeBuilder;

