/**
 * Tips System - Football Manager Style
 *
 * A comprehensive tips and hints system for Meridian platform
 * inspired by Football Manager's loading screens and contextual help.
 *
 * @example
 * ```tsx
 * // Show loading tips
 * import { LoadingScreenTips } from '@/components/tips';
 *
 * <LoadingScreenTips isLoading={isLoading} />
 * ```
 *
 * @example
 * ```tsx
 * // Show contextual tips
 * import { ContextualTip } from '@/components/tips';
 *
 * <ContextualTip position="floating" autoHide={5000} />
 * ```
 *
 * @example
 * ```tsx
 * // Show onboarding tour
 * import { OnboardingTour } from '@/components/tips';
 * import { getFlowById } from '@/lib/tips/onboardingFlows';
 *
 * const flow = getFlowById('getting-started');
 * <OnboardingTour flow={flow} onComplete={() =>} />
 * ```
 *
 * @example
 * ```tsx
 * // Open tips panel
 * import { TipsPanel } from '@/components/tips';
 *
 * <TipsPanel />
 * ```
 *
 * @example
 * ```tsx
 * // Use tips in your component
 * import { useTips } from '@/hooks/use-tips';
 *
 * function MyComponent() {
 *   const { getTipForContext, dismissTip } = useTips();
 *   const tip = getTipForContext();
 *   // ...
 * }
 * ```
 */

export { TipsProvider } from './TipsProvider';
export { TipCard } from './TipCard';
export { LoadingScreenTips } from './LoadingScreenTips';
export { ContextualTip } from './ContextualTip';
export { OnboardingTour } from './OnboardingTour';
export { TipsPanel } from './TipsPanel';
