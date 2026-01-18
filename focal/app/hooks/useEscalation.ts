'use client';

import { useEffect, useRef, useCallback } from 'react';
import { FocusState } from '../lib/focusClassifier';
import { useFocusStore, ESCALATION_THRESHOLDS } from '../store/focusStore';
import { generateInterventionMessage } from '../lib/gemini';
import { useVoiceResponse } from './useVoiceResponse';

interface UseEscalationOptions {
  voiceEnabled?: boolean;
}

// Escalation check interval in milliseconds
const ESCALATION_CHECK_INTERVAL = 500;

// Maximum escalation level
const MAX_ESCALATION_LEVEL = 3;

/**
 * Determines the new escalation level based on current level and distraction duration
 */
function determineEscalationLevel(
  currentLevel: number,
  distractionDuration: number,
  timeSinceLastEscalation: number
): { shouldEscalate: boolean; newLevel: number } {
  if (currentLevel === 0 && distractionDuration >= ESCALATION_THRESHOLDS.LEVEL_1_DELAY) {
    return { shouldEscalate: true, newLevel: 1 };
  }

  if (currentLevel === 1 && timeSinceLastEscalation >= ESCALATION_THRESHOLDS.LEVEL_2_DELAY) {
    return { shouldEscalate: true, newLevel: 2 };
  }

  if (currentLevel === 2 && timeSinceLastEscalation >= ESCALATION_THRESHOLDS.LEVEL_3_DELAY) {
    return { shouldEscalate: true, newLevel: MAX_ESCALATION_LEVEL };
  }

  return { shouldEscalate: false, newLevel: currentLevel };
}

/**
 * Triggers voice response if enabled
 */
function triggerVoiceResponse(
  voiceEnabled: boolean,
  speakContextualMessage: (focusState: FocusState, reason: string, level: number) => void,
  focusState: FocusState,
  focusReason: string,
  escalationLevel: number
): void {
  if (voiceEnabled) {
    speakContextualMessage(focusState, focusReason, escalationLevel);
  }
}

/**
 * Hook that manages escalation timing and triggers interventions
 */
export function useEscalation(options: UseEscalationOptions = {}) {
  const { voiceEnabled = false } = options;
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

  const { speakContextualMessage } = useVoiceResponse({
    enabled: voiceEnabled,
  });

  const handleEscalation = useCallback(
    async (newLevel: number, distractionDurationSeconds: number) => {
      console.log(`[Escalation] Escalating to level ${newLevel}`);
      isGeneratingRef.current = true;

      try {
        const message = await generateInterventionMessage({
          focusState,
          reason: focusReason,
          distractionDuration: distractionDurationSeconds,
          escalationLevel: newLevel,
          distractionCount: sessionStats.distractionCount,
        });

        setPendingMessage(message);
        escalate();
        triggerVoiceResponse(voiceEnabled, speakContextualMessage, focusState, focusReason, newLevel);
      } catch (error) {
        console.error('[Escalation] Failed to generate message:', error);
        escalate();
        triggerVoiceResponse(voiceEnabled, speakContextualMessage, focusState, focusReason, newLevel);
      } finally {
        isGeneratingRef.current = false;
      }
    },
    [
      focusState,
      focusReason,
      distractionStartTime,
      sessionStats.distractionCount,
      escalate,
      setPendingMessage,
      voiceEnabled,
      speakContextualMessage,
    ]
  );

  const checkEscalation = useCallback(async () => {
    if (!isSessionActive || isGeneratingRef.current) return;

    const now = Date.now();

    if (focusState === 'focused' && focusedSinceReset) {
      const focusedDuration = now - focusedSinceReset;
      if (focusedDuration >= ESCALATION_THRESHOLDS.RESET_FOCUS_TIME && escalationLevel > 0) {
        console.log('[Escalation] Reset triggered - focused for 30s');
        resetEscalation();
        return;
      }
    }

    if (focusState !== 'distracted' || !distractionStartTime) return;

    const distractionDuration = now - distractionStartTime;
    const timeSinceLastEscalation = lastEscalationTime
      ? now - lastEscalationTime
      : distractionDuration;

    const { shouldEscalate, newLevel } = determineEscalationLevel(
      escalationLevel,
      distractionDuration,
      timeSinceLastEscalation
    );

    if (shouldEscalate && newLevel > escalationLevel) {
      const distractionDurationSeconds = distractionDuration / 1000;
      await handleEscalation(newLevel, distractionDurationSeconds);
    }
  }, [
    isSessionActive,
    focusState,
    focusReason,
    escalationLevel,
    distractionStartTime,
    lastEscalationTime,
    focusedSinceReset,
    resetEscalation,
    handleEscalation,
  ]);

  useEffect(() => {
    if (isSessionActive) {
      checkIntervalRef.current = setInterval(checkEscalation, ESCALATION_CHECK_INTERVAL);
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
