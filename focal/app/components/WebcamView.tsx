'use client';

import { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebcamState } from '../hooks/useWebcam';

interface WebcamViewProps {
    videoRef: RefObject<HTMLVideoElement | null>;
    state: WebcamState;
    onStart: () => void;
    showDebugOverlay?: boolean;
}

export function WebcamView({
    videoRef,
    state,
    onStart,
    showDebugOverlay = false,
}: WebcamViewProps) {
    return (
        <div className="webcam-container aspect-video w-full max-w-md relative">
            {/* Video element - always present but may be hidden */}
            <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full ${state.isActive ? 'block' : 'hidden'}`}
            />

            {/* Loading state */}
            <AnimatePresence>
                {state.isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-3 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin" />
                            <p className="text-[var(--text-secondary)] text-sm">Accessing camera...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inactive state - prompt to start */}
            <AnimatePresence>
                {!state.isActive && !state.isLoading && !state.error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]"
                    >
                        <div className="flex flex-col items-center gap-6 p-8">
                            <div className="w-20 h-20 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                <svg
                                    className="w-10 h-10 text-[var(--text-muted)]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                    Camera Access Required
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                                    Focal needs camera access to monitor your focus. Your video stays on your device.
                                </p>
                            </div>
                            <button onClick={onStart} className="btn-primary">
                                Enable Camera
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error state */}
            <AnimatePresence>
                {state.error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)]"
                    >
                        <div className="flex flex-col items-center gap-4 p-8">
                            <div className="w-16 h-16 rounded-full bg-[var(--accent-danger)]/20 flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-[var(--accent-danger)]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                    Camera Error
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] max-w-xs">
                                    {state.error}
                                </p>
                            </div>
                            <button onClick={onStart} className="btn-secondary">
                                Try Again
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Debug overlay for face detection visualization */}
            {showDebugOverlay && state.isActive && (
                <canvas
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                />
            )}

            {/* Status indicator */}
            {state.isActive && (
                <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-focus)] animate-pulse" />
                    <span className="text-xs text-white font-medium">LIVE</span>
                </div>
            )}
        </div>
    );
}
