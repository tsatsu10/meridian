
import { useRef, useEffect } from 'react';
import { logger } from "../lib/logger";

export const useRenderTime = (_componentName: string) => {
  const renderCount = useRef(0);
  const startTime = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    startTime.current = performance.now();

    return () => {
      const endTime = performance.now();
      void (endTime - startTime.current);
      logger.info("${componentName} rendered ${renderCount.current} times. Last render took ${renderTime.toFixed(2)}ms");
    };
  });
};
