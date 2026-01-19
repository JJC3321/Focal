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
        <div className="webcam-container aspect-video w-full relative">
            {/* Video element */}
            <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full h-full rounded-[var(--radius-xl)] ${state.isActive ? 'block' : 'hidden'}`}
            />

            {/* Loading state */}
            <AnimatePresence>
                {state.isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)] rounded-[var(--radius-xl)]"
                    >
                        <div className="flex flex-col items-center gap-5">
                            <div className="w-12 h-12 rounded-full border-2 border-[var(--accent-primary)] border-t-transparent animate-spin" />
                            <p className="text-[var(--text-muted)] text-sm font-medium">
                                Accessing camera...
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inactive state - Camera permission prompt */}
            <AnimatePresence>
                {!state.isActive && !state.isLoading && !state.error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)] rounded-[var(--radius-xl)]"
                    >
                        <div className="flex flex-col items-center gap-8 p-10 max-w-sm text-center">
                            {/* Camera icon with glow */}
                            <div className="relative">
                                <div className="absolute inset-0 bg-[var(--accent-primary)] blur-2xl opacity-20 rounded-full scale-150" />
                                <div className="w-24 h-24 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--glass-border)] flex items-center justify-center relative">
                                    <svg
                                        className="w-12 h-12 text-[var(--accent-primary)]"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={1.5}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                        />
                                    </svg>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                                    Camera Access Required
                                </h3>
                                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                                    Focal uses your camera to monitor focus. All processing happens locally on your device.
                                </p>
                            </div>

                            <button
                                onClick={onStart}
                                className="btn-primary px-8"
                            >
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
                        className="absolute inset-0 flex items-center justify-center bg-[var(--bg-secondary)] rounded-[var(--radius-xl)]"
                    >
                        <div className="flex flex-col items-center gap-6 p-10 max-w-sm text-center">
                            <div className="w-20 h-20 rounded-2xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 flex items-center justify-center">
                                <svg
                                    className="w-10 h-10 text-[var(--accent-danger)]"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                                    Camera Error
                                </h3>
                                <p className="text-sm text-[var(--text-muted)]">
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

            {/* Debug overlay */}
            {showDebugOverlay && state.isActive && (
                <canvas
                    className="absolute inset-0 w-full h-full pointer-events-none rounded-[var(--radius-xl)]"
                    style={{ transform: 'scaleX(-1)' }}
                />
            )}

            {/* Live indicator */}
            {state.isActive && (
                <div className="absolute top-4 right-4 live-indicator">
                    <div className="dot" />
                    <span>LIVE</span>
                </div>
            )}

            {/* Subtle corner accents */}
            {state.isActive && (
                <>
                    <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[var(--accent-primary)]/30 rounded-tl-lg" />
                    <div className="absolute top-4 right-16 w-8 h-8 border-r-2 border-t-2 border-[var(--accent-primary)]/30 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[var(--accent-primary)]/30 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[var(--accent-primary)]/30 rounded-br-lg" />
                </>
            )}
        </div>
    );
}
