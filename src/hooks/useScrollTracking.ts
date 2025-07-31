import { useEffect, useRef } from 'react';
import { trackSectionView } from '../utils/analytics';

// Hook to track when sections come into view
export const useScrollTracking = (sectionName: string, threshold: number = 0.5) => {
  const elementRef = useRef<HTMLElement>(null);
  const hasBeenViewed = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasBeenViewed.current) {
            trackSectionView(sectionName);
            hasBeenViewed.current = true;
          }
        });
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [sectionName, threshold]);

  return elementRef;
};