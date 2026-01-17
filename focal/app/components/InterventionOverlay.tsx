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
                        className={`glass-card p-6 ${isLevel2 ? 'max-w-md' : 'max-w-sm'
                            } border-l-4 ${isLevel2
                                ? 'border-l-[var(--accent-warning)]'
                                : 'border-l-[var(--accent-purple)]'
                            }`}
                    >
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-4">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isLevel2
                                        ? 'bg-[var(--accent-warning)]/20'
                                        : 'bg-[var(--accent-purple)]/20'
                                    }`}
                            >
                                {isLevel2 ? '⚠️' : '👀'}
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">
                                    {isLevel2 ? 'Hey! Focus up!' : 'Quick reminder'}
                                </h3>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {isLevel2 ? 'Second warning' : 'First nudge'}
                                </p>
                            </div>
                        </div>

                        {/* Message */}
                        <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
                            {pendingMessage}
                        </p>

                        {/* Action button */}
                        <button
                            onClick={dismissIntervention}
                            className={`w-full py-2.5 rounded-lg font-medium transition-all ${isLevel2
                                    ? 'bg-[var(--accent-warning)] text-black hover:bg-[var(--accent-warning)]/90'
                                    : 'btn-secondary'
                                }`}
                        >
                            {isLevel2 ? "I'll refocus now" : 'Got it'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
