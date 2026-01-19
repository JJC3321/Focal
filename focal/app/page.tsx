'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { useWebcamWithLiveKit } from './hooks/useWebcamWithLiveKit';
import { useFocusDetection } from './hooks/useFocusDetection';
import { useOvershootDetection, OvershootAnalysis } from './hooks/useOvershootDetection';
import { useEscalation } from './hooks/useEscalation';
import { usePageVisibility } from './hooks/usePageVisibility';
import { useTabFocusNotification, requestNotificationPermission } from './hooks/useTabFocusNotification';
import { useFocusStore } from './store/focusStore';
import { initializeGemini, isGeminiInitialized } from './lib/gemini';
import { WebcamView } from './components/WebcamView';
import { FocusIndicator } from './components/FocusIndicator';
import { InterventionOverlay } from './components/InterventionOverlay';
import { UltimateDeterrent } from './components/UltimateDeterrent';
import { LiveKitStatus } from './components/LiveKitStatus';
import { TabFocusIndicator } from './components/TabFocusIndicator';

export default function Home() {
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
  const [overshootApiKey, setOvershootApiKey] = useState(process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY || '');
  const [isApiKeySet, setIsApiKeySet] = useState(!!process.env.NEXT_PUBLIC_GEMINI_API_KEY);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      initializeGemini(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    }
  }, []);
  const [detectionMode, setDetectionMode] = useState<'classic' | 'overshoot'>('classic');
  const [overshootAnalysis, setOvershootAnalysis] = useState<OvershootAnalysis | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  // Get store actions first so they're available for callbacks
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

  // Generate a stable room name for the session
  const roomName = useState(() => `focal-session-${Date.now()}`)[0];

  const { videoRef, state: webcamState, startCamera, stopCamera } = useWebcamWithLiveKit({
    enableLiveKit: false,
    publishVideo: false,
    roomName,
    participantName: 'User',
    onStreamingStateChange: useCallback((isStreaming: boolean) => {
      if (isStreaming) {
        toast.success('LiveKit connected');
      }
    }, []),
    // Removed onUnexpectedStop - was causing false triggers
  });

  const { isVisible } = usePageVisibility();

  useTabFocusNotification({
    isSessionActive,
  });

  const { state: overshootState } = useOvershootDetection({
    videoElement: videoRef.current,
    enabled: isSessionActive && webcamState.isActive && detectionMode === 'overshoot' && !!overshootApiKey,
    apiKey: overshootApiKey,
    onAnalysis: useCallback((analysis: OvershootAnalysis) => {
      setOvershootAnalysis(analysis);
    }, []),
  });

  const { state: mediapipeState } = useFocusDetection({
    videoElement: videoRef.current,
    enabled: isSessionActive && webcamState.isActive,
    fps: 10,
    overshootAnalysis: detectionMode === 'overshoot' ? overshootAnalysis : null,
    onStateChange: useCallback((state: typeof focusState, reason: string) => {
      updateFocusState(state, reason);
    }, [updateFocusState]),
  });

  const detectionState = mediapipeState;

  useEscalation({ voiceEnabled });

  const handleStartSession = async () => {
    if (!webcamState.isActive) {
      await startCamera();
    }

    const permissionGranted = await requestNotificationPermission();
    if (!permissionGranted) {
      toast.info('Enable notifications to get alerts when you switch tabs');
    }

    startSession();
    toast.success('Focus session started! Stay locked in. 🎯');
  };

  const handleEndSession = () => {
    endSession();
    stopCamera();
    toast.info('Session ended. Great work! 💪');
  };

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      initializeGemini(apiKey.trim());
      setIsApiKeySet(true);
      toast.success('Gemini API connected!');
    }
  };

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

      {/* Ambient background glow */}
      <div className="ambient-glow" />

      {/* Tab focus indicator */}
      <TabFocusIndicator isVisible={isVisible} isSessionActive={isSessionActive} />

      {/* Intervention overlays */}
      {escalationLevel === 1 && <InterventionOverlay level={1} />}
      {escalationLevel === 2 && <InterventionOverlay level={2} />}
      {escalationLevel === 3 && <UltimateDeterrent />}

      <div className="min-h-screen relative z-10 p-8 md:p-12 lg:p-16">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-6xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-[var(--accent-primary-light)] via-[var(--accent-primary)] to-[var(--accent-primary-dark)] bg-clip-text text-transparent">
                Focal
              </span>
            </h1>
            <p className="text-[var(--text-muted)] text-lg font-light tracking-wide">
              AI-powered focus monitoring with tough love
            </p>
          </motion.header>

          {/* API Key Setup Modal */}
          {!isApiKeySet && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 mb-12 max-w-lg mx-auto"
            >
              <div className="section-header">
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <h2>Connect AI Services</h2>
              </div>

              <form onSubmit={handleApiKeySubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="input-premium"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-2 opacity-70">
                    Powers AI personality & interventions
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
                    Overshoot API Key
                  </label>
                  <input
                    type="password"
                    value={overshootApiKey}
                    onChange={(e) => setOvershootApiKey(e.target.value)}
                    placeholder="Enter your Overshoot API key (optional)"
                    className="input-premium"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-2 opacity-70">
                    Optional • Enables advanced vision analysis
                  </p>
                </div>

                <button type="submit" className="btn-primary w-full mt-6">
                  Connect & Continue
                </button>
              </form>

              <button
                onClick={() => setIsApiKeySet(true)}
                className="w-full mt-4 py-3 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* Main Dashboard Grid */}
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left column - Webcam & Controls (3 cols) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Webcam View - Hero Section */}
              <div className="glass-card-glow p-1">
                <WebcamView
                  videoRef={videoRef}
                  state={webcamState}
                  onStart={startCamera}
                />
              </div>

              {/* Session Controls Card */}
              <div className="settings-card">
                <div className="settings-row">
                  <span className="settings-label">Detection Mode</span>
                  <select
                    value={detectionMode}
                    onChange={(e) => setDetectionMode(e.target.value as 'classic' | 'overshoot')}
                    className="select-premium"
                    disabled={isSessionActive}
                  >
                    <option value="classic">Classic (MediaPipe)</option>
                    <option value="overshoot">Hybrid (AI Enhanced)</option>
                  </select>
                </div>

                <div className="settings-row">
                  <span className="settings-label">Voice Responses</span>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`toggle-switch ${voiceEnabled ? 'active' : ''}`}
                    aria-label="Toggle voice responses"
                  />
                </div>
              </div>

              {/* Start/End Session Button */}
              {!isSessionActive ? (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStartSession}
                  disabled={!isApiKeySet && !isGeminiInitialized()}
                  className="btn-primary w-full py-5 text-lg"
                >
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                    </svg>
                    Start Focus Session
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEndSession}
                  className="btn-secondary w-full py-5 text-lg"
                >
                  <span className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    End Session
                  </span>
                </motion.button>
              )}
            </motion.div>

            {/* Right column - Stats & Info (2 cols) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Focus Status Indicator */}
              {isSessionActive && (
                <FocusIndicator
                  state={focusState}
                  reason={detectionState.reason || focusReason}
                />
              )}

              {/* Session Stats Card */}
              <div className="glass-card p-6">
                <div className="section-header">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                  </svg>
                  <h2>Session Stats</h2>
                </div>

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
                </div>

                {/* Escalation Level Bar */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Escalation Level
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {isSessionActive ? `${escalationLevel}/3` : '--'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((level) => (
                      <div
                        key={level}
                        className={`escalation-bar flex-1 ${level <= escalationLevel && isSessionActive ? 'active' : ''}`}
                        style={{
                          background: level <= escalationLevel && isSessionActive
                            ? level === 3
                              ? 'var(--accent-danger)'
                              : level === 2
                                ? 'var(--accent-warning)'
                                : level === 1
                                  ? 'var(--accent-primary)'
                                  : 'var(--accent-focus)'
                            : 'var(--bg-tertiary)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* How it works Card */}
              <div className="info-panel">
                <div className="section-header">
                  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                  <h2>How it works</h2>
                </div>

                <ul className="info-list">
                  <li>
                    <span className="bullet" style={{ background: 'var(--accent-focus)' }} />
                    <span>AI monitors your face & gaze direction</span>
                  </li>
                  <li>
                    <span className="bullet" style={{ background: 'var(--accent-primary)' }} />
                    <span>5s distracted → Gentle reminder</span>
                  </li>
                  <li>
                    <span className="bullet" style={{ background: 'var(--accent-warning)' }} />
                    <span>15s ignored → Firm warning</span>
                  </li>
                  <li>
                    <span className="bullet" style={{ background: 'var(--accent-danger)' }} />
                    <span>30s ignored → The intervention</span>
                  </li>
                  <li>
                    <span className="bullet" style={{ background: 'var(--text-muted)' }} />
                    <span>30s focused → Slate wiped clean</span>
                  </li>
                  {voiceEnabled && (
                    <li>
                      <svg className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11 5L6 9H2v6h4l5 4V5z" />
                        <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" fill="none" stroke="currentColor" strokeWidth="2" />
                      </svg>
                      <span>Voice feedback enabled</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Privacy Note */}
              <div className="privacy-note">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span>
                  {detectionMode === 'classic'
                    ? 'Video processed locally on your device'
                    : 'Hybrid mode sends frames to Overshoot API'
                  }
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}
