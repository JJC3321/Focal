'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useWebcam } from './hooks/useWebcam';
import { useFocusDetection } from './hooks/useFocusDetection';
import { useOvershootDetection } from './hooks/useOvershootDetection';
import { useEscalation } from './hooks/useEscalation';
import { useFocusStore } from './store/focusStore';
import { initializeGemini, isGeminiInitialized } from './lib/gemini';
import { WebcamView } from './components/WebcamView';
import { FocusIndicator } from './components/FocusIndicator';
import { InterventionOverlay } from './components/InterventionOverlay';
import { UltimateDeterrent } from './components/UltimateDeterrent';

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [overshootApiKey, setOvershootApiKey] = useState('');
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [detectionMode, setDetectionMode] = useState<'classic' | 'overshoot'>('classic');

  const { videoRef, state: webcamState, startCamera, stopCamera } = useWebcam();

  const {
    isSessionActive,
    focusState,
    focusReason,
    escalationLevel,
    sessionStats,
    startSession,
    endSession,
    updateFocusState,
  } = useFocusStore();

  // Focus detection - runs when session is active
  const { state: classicState } = useFocusDetection({
    videoElement: videoRef.current,
    enabled: isSessionActive && webcamState.isActive && detectionMode === 'classic',
    fps: 10,
    onStateChange: useCallback((state: typeof focusState, reason: string) => {
      if (detectionMode === 'classic') {
        updateFocusState(state, reason);
      }
    }, [updateFocusState, detectionMode]),
  });

  const { state: overshootState } = useOvershootDetection({
    videoElement: videoRef.current,
    enabled: isSessionActive && webcamState.isActive && detectionMode === 'overshoot',
    apiKey: overshootApiKey,
    onStateChange: useCallback((state: typeof focusState, reason: string) => {
      if (detectionMode === 'overshoot') {
        updateFocusState(state, reason);
      }
    }, [updateFocusState, detectionMode]),
  });

  const detectionState = detectionMode === 'classic' ? classicState : overshootState;

  // Escalation system
  useEscalation();

  // Handle session start
  const handleStartSession = async () => {
    if (!webcamState.isActive) {
      await startCamera();
    }
    startSession();
    toast.success('Focus session started! Stay locked in. 🎯');
  };

  // Handle session end
  const handleEndSession = () => {
    endSession();
    stopCamera();
    toast.info('Session ended. Great work! 💪');
  };

  // Handle API key submission
  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      initializeGemini(apiKey.trim());
      setIsApiKeySet(true);
      toast.success('Gemini API connected!');
    }
  };

  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Session duration timer
  const [sessionDuration, setSessionDuration] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSessionActive && sessionStats.startTime) {
      interval = setInterval(() => {
        setSessionDuration(Date.now() - sessionStats.startTime);
      }, 1000);
    } else {
      setSessionDuration(0);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionStats.startTime]);

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
          },
        }}
      />

      {/* Intervention overlays */}
      {escalationLevel === 1 && <InterventionOverlay level={1} />}
      {escalationLevel === 2 && <InterventionOverlay level={2} />}
      {escalationLevel === 3 && <UltimateDeterrent />}

      <div className="min-h-screen bg-[var(--bg-primary)] p-6 md:p-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-focus)] bg-clip-text text-transparent mb-3">
              Focal
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">
              AI-powered focus monitoring with tough love
            </p>
          </motion.header>

          {/* API Key Setup (if not set) */}
          {!isApiKeySet && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 mb-8 max-w-md mx-auto"
            >
              <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                🔑 Connect AI Services
              </h2>
              <form onSubmit={handleApiKeySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Gemini API Key (for personality)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Overshoot API Key (for vision)</label>
                  <input
                    type="password"
                    value={overshootApiKey}
                    onChange={(e) => setOvershootApiKey(e.target.value)}
                    placeholder="Enter your Overshoot API key (optional)"
                    className="w-full px-4 py-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)]"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Required for AI Vision mode. Get one at <a href="https://overshoot.ai" target="_blank" className="text-[var(--accent-purple)] hover:underline">overshoot.ai</a>
                  </p>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <label className="text-sm text-[var(--text-secondary)]">Detection Mode:</label>
                  <select
                    value={detectionMode}
                    onChange={(e) => setDetectionMode(e.target.value as 'classic' | 'overshoot')}
                    className="bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-primary)] rounded px-2 py-1 text-sm"
                  >
                    <option value="classic">Classic (MediaPipe)</option>
                    <option value="overshoot">AI (Overshoot)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary w-full">
                  Connect & Start
                </button>
              </form>
              <button
                onClick={() => setIsApiKeySet(true)}
                className="w-full mt-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                Skip (use fallback messages & classic mode)
              </button>
            </motion.div>
          )}

          {/* Main content grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left column - Webcam */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <WebcamView
                videoRef={videoRef}
                state={webcamState}
                onStart={startCamera}
              />

              {/* Session controls */}
              <div className="mt-6 flex gap-4">
                {!isSessionActive ? (
                  <button
                    onClick={handleStartSession}
                    disabled={!isApiKeySet && !isGeminiInitialized()}
                    className="btn-primary flex-1"
                  >
                    🚀 Start Focus Session
                  </button>
                ) : (
                  <button
                    onClick={handleEndSession}
                    className="btn-secondary flex-1"
                  >
                    ⏹ End Session
                  </button>
                )}
              </div>
            </motion.div>

            {/* Right column - Stats & Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Focus Status */}
              {isSessionActive && (
                <FocusIndicator
                  state={focusState}
                  reason={detectionState.reason || focusReason}
                />
              )}

              {/* Session Stats */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                  📊 Session Stats
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="stat-card">
                    <span className="stat-label">Duration</span>
                    <span className="stat-value">
                      {isSessionActive ? formatTime(sessionDuration) : '--'}
                    </span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Distractions</span>
                    <span className="stat-value">
                      {isSessionActive ? sessionStats.distractionCount : '--'}
                    </span>
                  </div>
                  <div className="stat-card col-span-2">
                    <span className="stat-label">Escalation Level</span>
                    <div className="flex items-center gap-2 mt-1">
                      {[0, 1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-2 flex-1 rounded-full transition-colors ${level <= escalationLevel && isSessionActive
                            ? level === 3
                              ? 'bg-[var(--accent-danger)]'
                              : level === 2
                                ? 'bg-[var(--accent-warning)]'
                                : level === 1
                                  ? 'bg-[var(--accent-purple)]'
                                  : 'bg-[var(--accent-focus)]'
                            : 'bg-[var(--bg-tertiary)]'
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="glass-card p-6">
                <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">
                  🎯 How it works
                </h2>
                <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-focus)]">•</span>
                    <span>AI monitors your face & gaze direction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-purple)]">•</span>
                    <span>5s distracted → Gentle reminder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-warning)]">•</span>
                    <span>15s ignored → Firm warning popup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--accent-danger)]">•</span>
                    <span>30s ignored → The McDonald's intervention 🍔</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--text-muted)]">•</span>
                    <span>30s focused → Slate wiped clean</span>
                  </li>
                </ul>
              </div>

              {/* Privacy note */}
              <p className="text-xs text-[var(--text-muted)] text-center">
                🔒 Your video never leaves your device. All processing happens locally.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
