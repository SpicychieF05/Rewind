'use client';

import { useState, useEffect } from 'react';

export interface AvailableSpace {
  width: number;
  height: number;
  isCompactWidth: boolean;   // width < 640
  isCompactHeight: boolean;  // height < 540
  canHover: boolean;
  isCoarsePointer: boolean;
}

export function useAvailableSpace(): AvailableSpace {
  // Always start with SSR-safe defaults (no window access) so server and
  // client render identical HTML. useEffect will sync to real values after
  // hydration completes, preventing the hydration mismatch warning.
  const [space, setSpace] = useState<AvailableSpace>({
    width: 1200,
    height: 800,
    isCompactWidth: false,
    isCompactHeight: false,
    canHover: true,
    isCoarsePointer: false,
  });

  useEffect(() => {
    const update = () => {
      const w = window.visualViewport?.width ?? window.innerWidth;
      const h = window.visualViewport?.height ?? window.innerHeight;
      const canHover = window.matchMedia('(hover: hover)').matches;
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;

      setSpace({
        width: w,
        height: h,
        isCompactWidth: w < 640,
        isCompactHeight: h < 540,
        canHover,
        isCoarsePointer: isCoarse,
      });
    };

    update();

    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', update);
      }
    };
  }, []);

  return space;
}
