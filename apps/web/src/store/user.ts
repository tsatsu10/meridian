/**
 * User Store - Compatibility Layer
 * Re-exports from consolidated auth store for backward compatibility
 * @deprecated Use @/store/consolidated/auth directly
 */

export { useAuthStore as useUserStore } from './consolidated/auth';
export type { UnifiedUser as User } from './consolidated/auth';

