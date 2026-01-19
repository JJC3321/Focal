'use client';

import { motion } from 'framer-motion';
import { FocusState } from '../lib/focusClassifier';

interface FocusIndicatorProps {
    state: FocusState;
    reason: string;
}

const stateConfig: Record<FocusState, {
    label: string;
    className: string;
    color: string;
    bgColor: string;
    borderColor: string;
}> = {
    focused: {
        label: 'Focused',
        className: 'focused',
        color: 'var(--accent-focus)',
        bgColor: 'rgba(74, 222, 128, 0.08)',
        borderColor: 'rgba(74, 222, 128, 0.2)',
    },
    distracted: {
        label: 'Distracted',
        className: 'distracted',
        color: 'var(--accent-warning)',
        bgColor: 'rgba(251, 191, 36, 0.08)',
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },
    idle: {
        label: 'Away',
        className: 'idle',
        color: 'var(--text-muted)',
        bgColor: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
    },
    unknown: {
        label: 'Detecting',
        className: 'idle',
        color: 'var(--accent-primary)',
        bgColor: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
    },
};

export function FocusIndicator({ state, reason }: FocusIndicatorProps) {
    const config = stateConfig[state];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[var(--radius-lg)]"
            style={{
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
            }}
        >
            {/* Animated glow effect for focused/distracted states */}
            {(state === 'focused' || state === 'distracted') && (
                <motion.div
                    className="absolute inset-0 opacity-30"
                    animate={{
                        background: [
                            `radial-gradient(circle at 0% 0%, ${config.color} 0%, transparent 50%)`,
                            `radial-gradient(circle at 100% 100%, ${config.color} 0%, transparent 50%)`,
                            `radial-gradient(circle at 0% 0%, ${config.color} 0%, transparent 50%)`,
                        ],
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                />
            )}

            <div className="relative p-5 flex items-center gap-4">
                {/* Status indicator dot */}
                <div className="relative">
                    <div
                        className={`focus-indicator ${config.className}`}
                        style={{
                            background: config.color,
                            boxShadow: state !== 'idle' && state !== 'unknown'
                                ? `0 0 20px ${config.color}40, 0 0 40px ${config.color}20`
                                : 'none'
                        }}
                    />
                </div>

                {/* Status text */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="font-semibold text-lg tracking-tight"
                            style={{ color: config.color }}
                        >
                            {config.label}
                        </span>
                    </div>
                    <p className="text-sm text-[var(--text-muted)] truncate">
                        {reason || 'Monitoring your focus...'}
                    </p>
                </div>

                {/* Pulse ring for active states */}
                {state === 'focused' && (
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <motion.div
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: config.color }}
                            animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <svg className="w-5 h-5" style={{ color: config.color }} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                )}

                {state === 'distracted' && (
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <motion.div
                            className="absolute inset-0 rounded-full border-2"
                            style={{ borderColor: config.color }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.3, 0.8] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                        <svg className="w-5 h-5" style={{ color: config.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
