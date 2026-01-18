'use client';

import { useEffect, useRef } from 'react';

interface UseTabFocusNotificationOptions {
  isSessionActive: boolean;
}

const NOTIFICATION_TITLE = '⚠️ Focal - Tab Not Focused';
const NOTIFICATION_BODY = 'Tracking continues in background. Return to focus your session.';
const NOTIFICATION_TAG = 'focal-tab-focus-warning';

export function useTabFocusNotification({
  isSessionActive,
}: UseTabFocusNotificationOptions) {
  const notificationRef = useRef<Notification | null>(null);
  const isSessionActiveRef = useRef(isSessionActive);

  // Keep ref in sync with prop
  useEffect(() => {
    isSessionActiveRef.current = isSessionActive;
  }, [isSessionActive]);

  // Listen directly to visibilitychange events instead of relying on React state
  useEffect(() => {
    if (typeof document === 'undefined' || !('Notification' in window)) {
      return;
    }

    const handleVisibilityChange = () => {
      const isHidden = document.hidden;
      const sessionActive = isSessionActiveRef.current;

      // Only show notification if session is active and tab just became hidden
      if (sessionActive && isHidden && Notification.permission === 'granted') {
        // Close any existing notification first to avoid duplicates
        if (notificationRef.current) {
          notificationRef.current.close();
          notificationRef.current = null;
        }

        try {
          const notification = new Notification(NOTIFICATION_TITLE, {
            body: NOTIFICATION_BODY,
            tag: NOTIFICATION_TAG,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            silent: false,
          });

          notificationRef.current = notification;

          // Focus window when notification is clicked
          notification.onclick = () => {
            if (window.focus) {
              window.focus();
            }
            notification.close();
            notificationRef.current = null;
          };

          // Clean up reference when notification closes
          notification.onclose = () => {
            notificationRef.current = null;
          };
        } catch (error) {
          console.error('Error showing notification:', error);
        }
      } else if (!isHidden && notificationRef.current) {
        // Hide notification when tab becomes visible again
        notificationRef.current.close();
        notificationRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (notificationRef.current) {
        notificationRef.current.close();
        notificationRef.current = null;
      }
    };
  }, []); // Empty deps - we use refs to access current values
}

/**
 * Request notification permission - must be called during a user gesture
 * Call this from handleStartSession or similar user-initiated action
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission was previously denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

