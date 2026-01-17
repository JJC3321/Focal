import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { FocusState } from '../lib/focusClassifier';

export type EscalationLevel = 0 | 1 | 2 | 3;

export interface SessionStats {
    startTime: number;
    totalFocusedTime: number;
    totalDistractedTime: number;
    distractionCount: number;
}

export interface FocusStore {
    // Current state
    focusState: FocusState;
    focusReason: string;

    // Session tracking
    isSessionActive: boolean;
    sessionStats: SessionStats;

    // Escalation
    escalationLevel: EscalationLevel;
    distractionStartTime: number | null;
    lastEscalationTime: number | null;
    lastInterventionTime: number | null;
    focusedSinceReset: number | null; // When user started being focused after distraction

    // Pending intervention message
    pendingMessage: string | null;

    // Actions
    startSession: () => void;
    endSession: () => void;
    updateFocusState: (state: FocusState, reason: string) => void;
    escalate: () => void;
    resetEscalation: () => void;
    setPendingMessage: (message: string | null) => void;
    dismissIntervention: () => void;
}

const initialSessionStats: SessionStats = {
    startTime: 0,
    totalFocusedTime: 0,
    totalDistractedTime: 0,
    distractionCount: 0,
};

export const useFocusStore = create<FocusStore>()(
    subscribeWithSelector((set, get) => ({
        // Initial state
        focusState: 'unknown',
        focusReason: 'Session not started',
        isSessionActive: false,
        sessionStats: { ...initialSessionStats },
        escalationLevel: 0,
        distractionStartTime: null,
        lastEscalationTime: null,
        lastInterventionTime: null,
        focusedSinceReset: null,
        pendingMessage: null,

        startSession: () => {
            set({
                isSessionActive: true,
                focusState: 'unknown',
                focusReason: 'Detecting focus...',
                sessionStats: {
                    ...initialSessionStats,
                    startTime: Date.now(),
                },
                escalationLevel: 0,
                distractionStartTime: null,
                lastEscalationTime: null,
                lastInterventionTime: null,
                focusedSinceReset: null,
                pendingMessage: null,
            });
        },

        endSession: () => {
            set({
                isSessionActive: false,
                focusState: 'unknown',
                focusReason: 'Session ended',
                escalationLevel: 0,
                distractionStartTime: null,
                pendingMessage: null,
            });
        },

        updateFocusState: (newState: FocusState, reason: string) => {
            const state = get();
            const now = Date.now();
            const prevState = state.focusState;

            // Track time spent in previous state
            let updatedStats = { ...state.sessionStats };

            if (state.isSessionActive && prevState !== 'unknown') {
                const timeSinceLastUpdate = state.distractionStartTime
                    ? now - state.distractionStartTime
                    : 0;

                if (prevState === 'focused') {
                    // Time was tracked via focusedSinceReset
                } else if (prevState === 'distracted' && timeSinceLastUpdate > 0) {
                    updatedStats.totalDistractedTime += timeSinceLastUpdate;
                }
            }

            // State transition logic
            if (newState === 'distracted' && prevState !== 'distracted') {
                // Entering distraction
                updatedStats.distractionCount += 1;
                set({
                    focusState: newState,
                    focusReason: reason,
                    sessionStats: updatedStats,
                    distractionStartTime: now,
                    focusedSinceReset: null,
                });
            } else if (newState === 'focused' && prevState !== 'focused') {
                // Returning to focus
                set({
                    focusState: newState,
                    focusReason: reason,
                    sessionStats: updatedStats,
                    focusedSinceReset: state.focusedSinceReset ?? now,
                });
            } else {
                // Same state, just update reason
                set({
                    focusState: newState,
                    focusReason: reason,
                });
            }
        },

        escalate: () => {
            const state = get();
            const newLevel = Math.min(state.escalationLevel + 1, 3) as EscalationLevel;

            set({
                escalationLevel: newLevel,
                lastEscalationTime: Date.now(),
                lastInterventionTime: Date.now(),
            });
        },

        resetEscalation: () => {
            set({
                escalationLevel: 0,
                distractionStartTime: null,
                lastEscalationTime: null,
                focusedSinceReset: null,
                pendingMessage: null,
            });
        },

        setPendingMessage: (message: string | null) => {
            set({ pendingMessage: message });
        },

        dismissIntervention: () => {
            set({
                pendingMessage: null,
                lastInterventionTime: Date.now(),
            });
        },
    }))
);

// Escalation timing constants (in milliseconds)
export const ESCALATION_THRESHOLDS = {
    LEVEL_1_DELAY: 5000,      // 5s distracted → Level 1
    LEVEL_2_DELAY: 10000,     // 10s after Level 1 → Level 2
    LEVEL_3_DELAY: 15000,     // 15s after Level 2 → Level 3
    RESET_FOCUS_TIME: 30000,  // 30s focused → reset escalation
};
