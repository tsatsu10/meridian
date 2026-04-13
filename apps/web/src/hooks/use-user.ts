import { useAuth } from '@/components/providers/unified-context-provider';

// Re-export useAuth as useUser for backward compatibility
export const useUser = useAuth;
