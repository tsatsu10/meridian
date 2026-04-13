/**
 * @fileoverview Intersection Observer Hook
 * @description Custom hook for efficiently observing element visibility with lazy loading support
 * @author Claude Code Assistant
 * @version 1.0.0
 */

import { useEffect, useState, useRef } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  freezeOnceVisible?: boolean;
}

interface UseIntersectionObserverReturn {
  isIntersecting: boolean;
  entry?: IntersectionObserverEntry;
}

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false,
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const frozen = useRef(false);

  const updateEntry = ([entry]: IntersectionObserverEntry[]) => {
    if (frozen.current) return;
    
    setEntry(entry);
    
    if (freezeOnceVisible && entry.isIntersecting) {
      frozen.current = true;
    }
  };

  useEffect(() => {
    const node = elementRef?.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen.current || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => {
      observer.disconnect();
      frozen.current = false;
    };
  }, [elementRef, threshold, root, rootMargin, freezeOnceVisible]);

  return {
    isIntersecting: !!entry?.isIntersecting,
    entry,
  };
}