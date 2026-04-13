import { useEffect, useMemo } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useTipsStore } from '@/store/tips';
import type { Tip, TipContext, TipCategory, TipLevel } from '@/types/tips';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';
import useWorkspaceStore from '@/store/workspace';

/**
 * Main hook for accessing tips functionality
 */
export function useTips() {
  const store = useTipsStore();
  const location = useLocation();
  const { user } = useAuth();
  const { workspace } = useWorkspaceStore();

  // Build current context
  const context: TipContext = useMemo(() => {
    const route = location.pathname;

    return {
      route,
      workspace: workspace?.id,
      user: user
        ? {
            id: user.id,
            role: 'member', // User role - can be extended with RBAC integration
            signupDate: new Date(user.createdAt || Date.now()),
          }
        : undefined,
    };
  }, [location.pathname, workspace?.id, user]);

  return {
    // State
    currentTip: store.currentTip,
    preferences: store.preferences,
    userProgress: store.userProgress,
    isLoading: store.isLoading,

    // Get tips
    getTipForContext: () => store.getTipForContext(context),
    getNextLoadingTip: store.getNextLoadingTip,
    searchTips: store.searchTips,
    getTipsByCategory: store.getTipsByCategory,
    getTipsByLevel: store.getTipsByLevel,
    getBookmarkedTips: store.getBookmarkedTips,

    // Actions
    markTipAsSeen: store.markTipAsSeen,
    dismissTip: store.dismissTip,
    bookmarkTip: store.bookmarkTip,
    unbookmarkTip: store.unbookmarkTip,
    recordTipAction: store.recordTipAction,

    // Preferences
    updatePreferences: store.updatePreferences,

    // Onboarding
    startOnboarding: store.startOnboarding,
    completeOnboardingStep: store.completeOnboardingStep,
    skipOnboardingStep: store.skipOnboardingStep,
    completeOnboarding: store.completeOnboarding,

    // Analytics
    getTipAnalytics: store.getTipAnalytics,
    recordTipView: store.recordTipView,

    // Reset
    resetProgress: store.resetProgress,
    resetPreferences: store.resetPreferences,

    // Context
    context,
  };
}

/**
 * Hook for loading screen tips
 */
export function useLoadingTip() {
  const { getNextLoadingTip, markTipAsSeen, preferences } = useTips();

  const tip = useMemo(() => {
    if (!preferences.showLoadingTips) return null;
    return getNextLoadingTip();
  }, [getNextLoadingTip, preferences.showLoadingTips]);

  useEffect(() => {
    if (tip) {
      markTipAsSeen(tip.id);
    }
  }, [tip, markTipAsSeen]);

  return tip;
}

/**
 * Hook for contextual tips based on current route/context
 */
export function useContextualTip() {
  const { getTipForContext, markTipAsSeen, preferences } = useTips();

  const tip = useMemo(() => {
    if (!preferences.showContextualTips) return null;
    return getTipForContext();
  }, [getTipForContext, preferences.showContextualTips]);

  useEffect(() => {
    if (tip) {
      // Small delay before marking as seen
      const timer = setTimeout(() => {
        markTipAsSeen(tip.id);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [tip, markTipAsSeen]);

  return tip;
}

/**
 * Hook for category-specific tips
 */
export function useCategoryTips(category: TipCategory) {
  const { getTipsByCategory } = useTips();

  return useMemo(() => getTipsByCategory(category), [category, getTipsByCategory]);
}

/**
 * Hook for level-specific tips
 */
export function useLevelTips(level: TipLevel) {
  const { getTipsByLevel } = useTips();

  return useMemo(() => getTipsByLevel(level), [level, getTipsByLevel]);
}

/**
 * Hook for bookmarked tips
 */
export function useBookmarkedTips() {
  const { getBookmarkedTips } = useTips();

  return useMemo(() => getBookmarkedTips(), [getBookmarkedTips]);
}

/**
 * Hook for tip search
 */
export function useTipSearch(query: string) {
  const { searchTips } = useTips();

  return useMemo(() => {
    if (!query || query.length < 2) return [];
    return searchTips(query);
  }, [query, searchTips]);
}

/**
 * Hook to track time a tip is visible
 */
export function useTipVisibility(tipId: string | null) {
  const { recordTipView } = useTips();

  useEffect(() => {
    if (!tipId) return;

    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      recordTipView(tipId, duration);
    };
  }, [tipId, recordTipView]);
}

/**
 * Hook for onboarding state
 */
export function useOnboarding() {
  const store = useTipsStore();

  return {
    currentFlow: store.currentOnboardingFlow,
    isCompleted: store.userProgress.completedOnboarding,
    currentStep: store.userProgress.onboardingStep,
    startOnboarding: store.startOnboarding,
    completeStep: store.completeOnboardingStep,
    skipStep: store.skipOnboardingStep,
    complete: store.completeOnboarding,
  };
}

/**
 * Hook to check if tips are enabled
 */
export function useTipsEnabled() {
  const { preferences } = useTips();
  return preferences.enabled;
}

/**
 * Hook to toggle tips on/off
 */
export function useToggleTips() {
  const { preferences, updatePreferences } = useTips();

  return () => {
    updatePreferences({ enabled: !preferences.enabled });
  };
}
