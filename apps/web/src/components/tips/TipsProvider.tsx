import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTipsStore } from '@/store/tips';
import { TIPS_DATABASE } from '@/lib/tips/tipsDatabase';
import useAuth from '@/components/providers/auth-provider/hooks/use-auth';

interface TipsProviderProps {
  children: ReactNode;
}

const TipsContext = createContext<{
  initialized: boolean;
} | null>(null);

export function TipsProvider({ children }: TipsProviderProps) {
  const { user } = useAuth();
  const tipsStore = useTipsStore();
  const [initialized, setInitialized] = React.useState(false);

  // Initialize tips database when provider mounts
  useEffect(() => {
    // Load tips from database into store
    if (tipsStore.tips.length === 0) {
      useTipsStore.setState({ tips: TIPS_DATABASE });
    }

    // Initialize user progress if user is authenticated
    if (user && !tipsStore.userProgress.userId) {
      useTipsStore.setState({
        userProgress: {
          ...tipsStore.userProgress,
          userId: user.id,
        },
      });
    }

    setInitialized(true);
  }, [user]);

  // Update user info when user changes
  useEffect(() => {
    if (user && tipsStore.userProgress.userId !== user.id) {
      useTipsStore.setState({
        userProgress: {
          ...tipsStore.userProgress,
          userId: user.id,
        },
      });
    }
  }, [user?.id]);

  return (
    <TipsContext.Provider value={{ initialized }}>
      {children}
    </TipsContext.Provider>
  );
}

export function useTipsContext() {
  const context = useContext(TipsContext);
  if (!context) {
    throw new Error('useTipsContext must be used within TipsProvider');
  }
  return context;
}
