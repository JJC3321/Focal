'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useFocusStore, ESCALATION_THRESHOLDS } from '../store/focusStore';
import { generateInterventionMessage } from '../lib/gemini';

/**
 * Hook that manages escalation timing and triggers interventions
 */
export function useEscalation() {
    const {
        focusState,
        focusReason,
        isSessionActive,
        escalationLevel,
        distractionStartTime,
        lastEscalationTime,
        focusedSinceReset,
        sessionStats,
        escalate,
        resetEscalation,
        setPendingMessage,
    } = useFocusStore();

    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isGeneratingRef = useRef(false);

    const checkEscalation = useCallback(async () => {
        if (!isSessionActive || isGeneratingRef.current) return;

        const now = Date.now();

        // Check for reset condition: focused for RESET_FOCUS_TIME
        if (focusState === 'focused' && focusedSinceReset) {
            const focusedDuration = now - focusedSinceReset;
            if (focusedDuration >= ESCALATION_THRESHOLDS.RESET_FOCUS_TIME && escalationLevel > 0) {
                console.log('[Escalation] Reset triggered - focused for 30s');
                resetEscalation();
                return;
            }
        }

        // Only escalate if distracted
        if (focusState !== 'distracted' || !distractionStartTime) return;

        const distractionDuration = now - distractionStartTime;
        const timeSinceLastEscalation = lastEscalationTime
            ? now - lastEscalationTime
            : distractionDuration;

        // Determine if we should escalate
        let shouldEscalate = false;
        let newLevel = escalationLevel;

        if (escalationLevel === 0 && distractionDuration >= ESCALATION_THRESHOLDS.LEVEL_1_DELAY) {
            shouldEscalate = true;
            newLevel = 1;
        } else if (escalationLevel === 1 && timeSinceLastEscalation >= ESCALATION_THRESHOLDS.LEVEL_2_DELAY) {
            shouldEscalate = true;
            newLevel = 2;
        } else if (escalationLevel === 2 && timeSinceLastEscalation >= ESCALATION_THRESHOLDS.LEVEL_3_DELAY) {
            shouldEscalate = true;
            newLevel = 3;
        }

        if (shouldEscalate && newLevel > escalationLevel) {
            console.log(`[Escalation] Escalating to level ${newLevel}`);
            isGeneratingRef.current = true;

            try {
                // Generate intervention message
                const message = await generateInterventionMessage({
                    focusState,
                    reason: focusReason,
                    distractionDuration: distractionDuration / 1000,
                    escalationLevel: newLevel,
                    distractionCount: sessionStats.distractionCount,
                });

                setPendingMessage(message);
                escalate();
            } catch (error) {
                console.error('[Escalation] Failed to generate message:', error);
                escalate();
            } finally {
                isGeneratingRef.current = false;
            }
        }
    }, [
        isSessionActive,
        focusState,
        focusReason,
        escalationLevel,
        distractionStartTime,
        lastEscalationTime,
        focusedSinceReset,
        sessionStats.distractionCount,
        escalate,
        resetEscalation,
        setPendingMessage,
    ]);

    // Run escalation check every 500ms when session is active
    useEffect(() => {
        if (isSessionActive) {
            checkIntervalRef.current = setInterval(checkEscalation, 500);
        }

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
        };
    }, [isSessionActive, checkEscalation]);

    return {
        escalationLevel,
        checkEscalation,
    };
}
