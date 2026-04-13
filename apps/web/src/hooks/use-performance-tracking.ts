import { useEffect, useRef } from 'react';
import { useRouter, type Router } from '@tanstack/react-router';
import { usePerformanceMonitor } from '@/services/performance-monitor';

// Accept optional router instance to avoid calling useRouter outside a RouterProvider
export const usePerformanceTracking = (routerParam?: Router<any, any>) => {
  const router = routerParam ?? useRouter();
  const { recordRouteChange, recordUserInteraction } = usePerformanceMonitor();
  const routeStartTime = useRef<number>(0);
  const lastRoute = useRef<string>('');

  useEffect(() => {
    if (!router) {
      return;
    }
    // Track route changes
    const unsubscribe = router.subscribe('onBeforeLoad', ({ location, cause }) => {
      routeStartTime.current = performance.now();
      
      if (lastRoute.current && cause !== 'replace' && location?.pathname) {
        recordUserInteraction('navigation', 0, {
          from: lastRoute.current,
          to: location.pathname,
          cause,
        });
      }
    });

    const unsubscribeAfter = router.subscribe('onLoad', ({ location }) => {
      const duration = performance.now() - routeStartTime.current;
      
      if (location?.pathname) {
        recordRouteChange(
          lastRoute.current || 'initial',
          location.pathname,
          duration
        );
        
        lastRoute.current = location.pathname;
      }
    });

    return () => {
      unsubscribe();
      unsubscribeAfter();
    };
  }, [router, recordRouteChange, recordUserInteraction]);

  return {
    trackUserInteraction: recordUserInteraction,
  };
};