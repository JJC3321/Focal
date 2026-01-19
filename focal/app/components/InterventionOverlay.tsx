'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useFocusStore } from '../store/focusStore';

interface InterventionOverlayProps {
    level: 1 | 2;
}

export function InterventionOverlay({ level }: InterventionOverlayProps) {
    const { pendingMessage, dismissIntervention } = useFocusStore();

    if (!pendingMessage) return null;

    const isLevel2 = level === 2;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={isLevel2 ? 'overlay-backdrop' : ''}
                onClick={isLevel2 ? undefined : dismissIntervention}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={`intervention-popup ${isLevel2 ? '' : 'fixed bottom-8 right-8'}`}
                >
                    <div
                        className="relative overflow-hidden"
                        style={{
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: 'var(--radius-lg)',
                            border: `1px solid ${isLevel2 ? 'var(--accent-warning)' : 'var(--accent-primary)'}`,
                            boxShadow: isLevel2
                                ? '0 0 60px var(--accent-warning-glow), 0 8px 32px rgba(0,0,0,0.5)'
                                : '0 0 40px var(--accent-primary-glow), 0 8px 32px rgba(0,0,0,0.5)',
                            padding: '24px',
                            maxWidth: isLevel2 ? '420px' : '360px',
                        }}
                    >
                        {/* Animated gradient border */}
                        <motion.div
                            className="absolute inset-0 opacity-20 pointer-events-none"
                            style={{
                                background: `linear-gradient(135deg, ${isLevel2 ? 'var(--accent-warning)' : 'var(--accent-primary)'} 0%, transparent 50%)`,
                            }}
                        />

                        {/* Top accent line */}
                        <div
                            className="absolute top-0 left-6 right-6 h-px"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${isLevel2 ? 'var(--accent-warning)' : 'var(--accent-primary)'}, transparent)`,
                            }}
                        />

                        {/* Header */}
                        <div className="relative flex items-start gap-4 mb-5">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{
                                    background: isLevel2
                                        ? 'rgba(251, 191, 36, 0.15)'
                                        : 'rgba(74, 144, 184, 0.15)',
                                    border: `1px solid ${isLevel2 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(74, 144, 184, 0.3)'}`,
                                }}
                            >
                                <svg
                                    className="w-6 h-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke={isLevel2 ? 'var(--accent-warning)' : 'var(--accent-primary)'}
                                    strokeWidth="2"
                                >
                                    {isLevel2 ? (
                                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    ) : (
                                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    )}
                                </svg>
                            </div>
                            <div>
                                <h3
                                    className="font-semibold text-lg tracking-tight"
                                    style={{ color: isLevel2 ? 'var(--accent-warning)' : 'var(--text-primary)' }}
                                >
                                    {isLevel2 ? 'Focus Required' : 'Quick Reminder'}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
                                    {isLevel2 ? 'Second warning' : 'First nudge'}
                                </p>
                            </div>
                        </div>

                        {/* Message */}
                        <p className="relative text-[var(--text-secondary)] leading-relaxed mb-6 text-[15px]">
                            {pendingMessage}
                        </p>

                        {/* Action button */}
                        <button
                            onClick={dismissIntervention}
                            className="relative w-full py-3.5 rounded-xl font-medium text-[15px] transition-all"
                            style={{
                                background: isLevel2
                                    ? 'var(--accent-warning)'
                                    : 'var(--gradient-primary)',
                                color: isLevel2 ? '#000' : '#fff',
                                boxShadow: isLevel2
                                    ? '0 4px 20px var(--accent-warning-glow)'
                                    : '0 4px 20px var(--accent-primary-glow)',
                            }}
                        >
                            {isLevel2 ? "I'll refocus now" : 'Got it'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
