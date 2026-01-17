'use client';

import { motion } from 'framer-motion';
import { FocusState } from '../lib/focusClassifier';

interface FocusIndicatorProps {
    state: FocusState;
    reason: string;
}

const stateConfig: Record<FocusState, { label: string; className: string; emoji: string }> = {
    focused: {
        label: 'Focused',
        className: 'focused',
        emoji: '🎯',
    },
    distracted: {
        label: 'Distracted',
        className: 'distracted',
        emoji: '😵‍💫',
    },
    idle: {
        label: 'Away',
        className: 'idle',
        emoji: '💤',
    },
    unknown: {
        label: 'Detecting...',
        className: 'idle',
        emoji: '🔍',
    },
};

export function FocusIndicator({ state, reason }: FocusIndicatorProps) {
    const config = stateConfig[state];

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 glass-card"
        >
            <div className={`focus-indicator ${config.className}`} />
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{config.emoji}</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                        {config.label}
                    </span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{reason}</p>
            </div>
        </motion.div>
    );
}
