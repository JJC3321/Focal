'use client';

import { motion } from 'framer-motion';

interface LiveKitStatusProps {
  isConnected: boolean;
  isStreaming: boolean;
  error: string | null;
  participants: number;
}

export function LiveKitStatus({
  isConnected,
  isStreaming,
  error,
  participants,
}: LiveKitStatusProps) {
  if (!isConnected && !error) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected && isStreaming
                ? 'bg-green-500 animate-pulse'
                : isConnected
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              LiveKit {isConnected && isStreaming ? 'Streaming' : isConnected ? 'Connected' : 'Disconnected'}
            </p>
            {isConnected && (
              <p className="text-xs text-[var(--text-muted)]">
                {participants} participant{participants !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {error && (
          <p className="text-xs text-[var(--accent-danger)]">{error}</p>
        )}
      </div>
    </motion.div>
  );
}

