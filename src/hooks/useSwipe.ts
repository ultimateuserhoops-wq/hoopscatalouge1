import { useCallback, useRef } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  preventScroll?: boolean;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  preventScroll = false,
}: SwipeHandlers) {
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    touchEnd.current = null;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      touchEnd.current = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      };
      if (preventScroll && touchStart.current) {
        const dx = Math.abs(touchEnd.current.x - touchStart.current.x);
        const dy = Math.abs(touchEnd.current.y - touchStart.current.y);
        if (dx > dy && dx > 10) {
          e.preventDefault();
        }
      }
    },
    [preventScroll]
  );

  const onTouchEnd = useCallback(() => {
    if (!touchStart.current || !touchEnd.current) {
      touchStart.current = null;
      touchEnd.current = null;
      return;
    }
    const dx = touchEnd.current.x - touchStart.current.x;
    const dy = touchEnd.current.y - touchStart.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > threshold && absDx > absDy * 1.5) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    } else if (absDy > threshold && absDy > absDx * 1.5) {
      if (dy < 0) onSwipeUp?.();
      else onSwipeDown?.();
    }
    touchStart.current = null;
    touchEnd.current = null;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
