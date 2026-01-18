'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface TabFocusIndicatorProps {
  isVisible: boolean;
  isSessionActive: boolean;
}

export function TabFocusIndicator({ isVisible, isSessionActive }: TabFocusIndicatorProps) {
  // Only show when session is active and tab is not visible
  const shouldShow = isSessionActive && !isVisible;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          key="tab-focus-warning"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-[var(--accent-warning)] to-[var(--accent-danger)] text-white py-4 px-6 shadow-2xl"
          style={{
            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.5), 0 0 40px rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-3 h-3 bg-white rounded-full"
            />
            <span className="font-bold text-base md:text-lg">
              ⚠️ Tab is not focused - Tracking continues in background
            </span>
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              className="w-3 h-3 bg-white rounded-full"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

