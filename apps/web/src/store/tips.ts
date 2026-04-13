import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Tip,
  TipContext,
  TipPreferences,
  UserTipProgress,
  TipAnalytics,
  OnboardingFlow,
  TipsStore as TipsStoreType,
  TipCategory,
  TipLevel,
} from "@/types/tips";

// Default preferences
const defaultPreferences: TipPreferences = {
  enabled: true,
  frequency: 'medium',
  categories: [
    'navigation',
    'tasks',
    'communication',
    'analytics',
    'automation',
    'shortcuts',
    'collaboration',
    'workflows',
    'reports',
    'settings',
  ],
  types: ['loading', 'contextual', 'notification', 'onboarding', 'tooltip'],
  showOnboarding: true,
  showLoadingTips: true,
  showContextualTips: true,
  showNotificationTips: true,
  autoAdvanceOnboarding: false,
  soundEnabled: false,
  animationsEnabled: true,
};

// Default user progress
const defaultUserProgress: UserTipProgress = {
  userId: '',
  seenTips: [],
  dismissedTips: [],
  bookmarkedTips: [],
  completedOnboarding: false,
  onboardingStep: 0,
  tipViewCounts: {},
  actionsFromTips: 0,
};

export const useTipsStore = create<TipsStoreType>()(
  persist(
    (set, get) => ({
      // State
      tips: [],
      userProgress: defaultUserProgress,
      preferences: defaultPreferences,
      analytics: {},
      currentTip: null,
      currentOnboardingFlow: null,
      isLoading: false,
      error: null,

      // Get tip for specific context
      getTipForContext: (context: TipContext): Tip | null => {
        const { tips, preferences, userProgress } = get();

        if (!preferences.enabled) return null;

        // Filter tips based on context and preferences
        const eligibleTips = tips.filter((tip) => {
          // Check if tip type is enabled
          if (!preferences.types.includes(tip.type)) return false;

          // Check if category is enabled
          if (!preferences.categories.includes(tip.category)) return false;

          // Check if already dismissed permanently
          if (userProgress.dismissedTips.includes(tip.id)) return false;

          // Check frequency
          if (tip.frequency === 'once' && userProgress.seenTips.includes(tip.id)) {
            return false;
          }

          // Check if tip has route trigger matching current route
          if (tip.triggers) {
            const hasMatchingTrigger = tip.triggers.some((trigger) => {
              if (trigger.route && context.route) {
                return context.route.includes(trigger.route);
              }
              return false;
            });

            if (!hasMatchingTrigger) return false;
          }

          // Check permissions (if required)
          if (tip.requiredPermissions && tip.requiredPermissions.length > 0 && context.user) {
            // RBAC integration would go here if needed
            // Currently tips don't require specific permissions
            // This is ready for future RBAC integration
          }

          // Check user age requirements
          if (context.user?.signupDate) {
            const userAgeDays = Math.floor(
              (Date.now() - context.user.signupDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (tip.minUserAge && userAgeDays < tip.minUserAge) return false;
            if (tip.maxUserAge && userAgeDays > tip.maxUserAge) return false;
          }

          // Check if expired
          if (tip.expiresAt && new Date(tip.expiresAt) < new Date()) {
            return false;
          }

          return true;
        });

        if (eligibleTips.length === 0) return null;

        // Sort by priority
        eligibleTips.sort((a, b) => b.priority - a.priority);

        // Apply frequency-based filtering
        const frequencyFiltered = get().applyFrequencyFilter(eligibleTips);

        return frequencyFiltered[0] || null;
      },

      // Helper to apply frequency filtering
      applyFrequencyFilter: (tips: Tip[]): Tip[] => {
        const { userProgress, preferences } = get();
        const now = new Date();

        return tips.filter((tip) => {
          const lastShown = userProgress.lastShownDate
            ? new Date(userProgress.lastShownDate)
            : null;

          switch (tip.frequency) {
            case 'once':
              return !userProgress.seenTips.includes(tip.id);

            case 'daily':
              if (!lastShown) return true;
              const daysSinceLastShown = Math.floor(
                (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24)
              );
              return daysSinceLastShown >= 1;

            case 'weekly':
              if (!lastShown) return true;
              const weeksSinceLastShown = Math.floor(
                (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60 * 24 * 7)
              );
              return weeksSinceLastShown >= 1;

            case 'session':
              // Session-based: Show once per browser session
              // Currently treats as 'always' - can be enhanced with session storage
              return true;

            case 'always':
              return true;

            default:
              return true;
          }
        });
      },

      // Get next loading tip
      getNextLoadingTip: (): Tip | null => {
        const { tips, preferences, userProgress } = get();

        if (!preferences.enabled || !preferences.showLoadingTips) return null;

        const loadingTips = tips.filter(
          (tip) =>
            tip.type === 'loading' &&
            !userProgress.dismissedTips.includes(tip.id) &&
            preferences.categories.includes(tip.category)
        );

        if (loadingTips.length === 0) return null;

        // Get tips not yet seen, or rotate through all
        const unseenTips = loadingTips.filter(
          (tip) => !userProgress.seenTips.includes(tip.id)
        );

        const tipsToChooseFrom = unseenTips.length > 0 ? unseenTips : loadingTips;

        // Weighted random selection based on priority
        const totalPriority = tipsToChooseFrom.reduce((sum, tip) => sum + tip.priority, 0);
        let random = Math.random() * totalPriority;

        for (const tip of tipsToChooseFrom) {
          random -= tip.priority;
          if (random <= 0) {
            return tip;
          }
        }

        return tipsToChooseFrom[0];
      },

      // Mark tip as seen
      markTipAsSeen: (tipId: string) => {
        set((state) => {
          const seenTips = state.userProgress.seenTips.includes(tipId)
            ? state.userProgress.seenTips
            : [...state.userProgress.seenTips, tipId];

          const viewCount = (state.userProgress.tipViewCounts[tipId] || 0) + 1;

          return {
            userProgress: {
              ...state.userProgress,
              seenTips,
              lastShownTip: tipId,
              lastShownDate: new Date(),
              tipViewCounts: {
                ...state.userProgress.tipViewCounts,
                [tipId]: viewCount,
              },
            },
          };
        });

        // Record analytics
        get().recordTipView(tipId, 0);
      },

      // Dismiss tip
      dismissTip: (tipId: string, permanent = false) => {
        set((state) => {
          if (!permanent) {
            // Just mark as seen
            return state;
          }

          return {
            userProgress: {
              ...state.userProgress,
              dismissedTips: [...state.userProgress.dismissedTips, tipId],
            },
          };
        });

        // Record dismissal in analytics
        const analytics = get().analytics[tipId];
        if (analytics) {
          set((state) => ({
            analytics: {
              ...state.analytics,
              [tipId]: {
                ...analytics,
                dismissals: analytics.dismissals + 1,
              },
            },
          }));
        }
      },

      // Bookmark tip
      bookmarkTip: (tipId: string) => {
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            bookmarkedTips: [...state.userProgress.bookmarkedTips, tipId],
          },
        }));

        // Record in analytics
        const analytics = get().analytics[tipId];
        if (analytics) {
          set((state) => ({
            analytics: {
              ...state.analytics,
              [tipId]: {
                ...analytics,
                bookmarks: analytics.bookmarks + 1,
              },
            },
          }));
        }
      },

      // Unbookmark tip
      unbookmarkTip: (tipId: string) => {
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            bookmarkedTips: state.userProgress.bookmarkedTips.filter((id) => id !== tipId),
          },
        }));

        // Update analytics
        const analytics = get().analytics[tipId];
        if (analytics && analytics.bookmarks > 0) {
          set((state) => ({
            analytics: {
              ...state.analytics,
              [tipId]: {
                ...analytics,
                bookmarks: analytics.bookmarks - 1,
              },
            },
          }));
        }
      },

      // Record tip action
      recordTipAction: (tipId: string, action: string) => {
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            actionsFromTips: state.userProgress.actionsFromTips + 1,
          },
        }));

        // Update analytics
        const analytics = get().analytics[tipId];
        if (analytics) {
          set((state) => ({
            analytics: {
              ...state.analytics,
              [tipId]: {
                ...analytics,
                actions: analytics.actions + 1,
                conversionRate: (analytics.actions + 1) / analytics.views,
              },
            },
          }));
        }
      },

      // Update preferences
      updatePreferences: (newPreferences: Partial<TipPreferences>) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences,
          },
        }));
      },

      // Onboarding
      startOnboarding: (flowId: string) => {
        // Import flows dynamically to avoid circular dependencies
        import('@/lib/tips/onboardingFlows').then(({ getFlowById }) => {
          const flow = getFlowById(flowId);
          if (flow) {
            set({
              currentOnboardingFlow: flow,
              userProgress: {
                ...get().userProgress,
                onboardingStep: 0,
              },
            });
          }
        });
      },

      completeOnboardingStep: (stepId: string) => {
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            onboardingStep: (state.userProgress.onboardingStep || 0) + 1,
          },
        }));
      },

      skipOnboardingStep: (stepId: string) => {
        get().completeOnboardingStep(stepId);
      },

      completeOnboarding: () => {
        set((state) => ({
          userProgress: {
            ...state.userProgress,
            completedOnboarding: true,
          },
          currentOnboardingFlow: null,
        }));
      },

      // Search and filter
      searchTips: (query: string): Tip[] => {
        const { tips } = get();
        const lowercaseQuery = query.toLowerCase();

        return tips.filter(
          (tip) =>
            tip.title.toLowerCase().includes(lowercaseQuery) ||
            tip.content.toLowerCase().includes(lowercaseQuery) ||
            tip.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery)) ||
            tip.keywords?.some((keyword) => keyword.toLowerCase().includes(lowercaseQuery))
        );
      },

      getTipsByCategory: (category: TipCategory): Tip[] => {
        return get().tips.filter((tip) => tip.category === category);
      },

      getTipsByLevel: (level: TipLevel): Tip[] => {
        return get().tips.filter((tip) => tip.level === level);
      },

      getBookmarkedTips: (): Tip[] => {
        const { tips, userProgress } = get();
        return tips.filter((tip) => userProgress.bookmarkedTips.includes(tip.id));
      },

      // Analytics
      getTipAnalytics: (tipId: string): TipAnalytics | null => {
        return get().analytics[tipId] || null;
      },

      recordTipView: (tipId: string, duration: number) => {
        const analytics = get().analytics[tipId];

        if (analytics) {
          const newAvgTime =
            (analytics.avgTimeVisible * analytics.views + duration) / (analytics.views + 1);

          set((state) => ({
            analytics: {
              ...state.analytics,
              [tipId]: {
                ...analytics,
                views: analytics.views + 1,
                avgTimeVisible: newAvgTime,
                lastShown: new Date(),
              },
            },
          }));
        } else {
          set((state) => ({
            analytics: {
              ...state.analytics,
              [tipId]: {
                tipId,
                views: 1,
                dismissals: 0,
                actions: 0,
                bookmarks: 0,
                avgTimeVisible: duration,
                conversionRate: 0,
                lastShown: new Date(),
              },
            },
          }));
        }
      },

      // Reset
      resetProgress: () => {
        set({
          userProgress: defaultUserProgress,
        });
      },

      resetPreferences: () => {
        set({
          preferences: defaultPreferences,
        });
      },
    }),
    {
      name: 'meridian-tips',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProgress: state.userProgress,
        preferences: state.preferences,
        analytics: state.analytics,
      }),
    }
  )
);
