'use client';

import { useState, useEffect } from 'react';

export interface PageVisibilityState {
  isVisible: boolean;
  isHidden: boolean;
}

export function usePageVisibility(): PageVisibilityState {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    if (typeof document === 'undefined') {
      return true;
    }
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      // Debug log to verify visibility detection
      console.log('Page visibility changed:', visible ? 'visible' : 'hidden');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    isVisible,
    isHidden: !isVisible,
  };
}

