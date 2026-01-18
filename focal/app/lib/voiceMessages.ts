/**
 * Voice message configuration and generation
 * Provides context-aware voice messages based on focus state and escalation level
 */

import { FocusState } from './focusClassifier';

// Escalation level constants
export const ESCALATION_LEVEL = {
  FIRST: 1,
  SECOND: 2,
  THIRD: 3,
} as const;

// Distraction pattern keywords
const DISTRACTION_PATTERNS = {
  PHONE: ['phone', 'mobile', 'device'],
  LOOKING_AWAY: ['looking'],
  LOOKING_DIRECTIONS: ['away', 'left', 'right', 'down', 'up'],
  EYES_CLOSED: ['eyes'],
  EYES_STATES: ['closed', 'close'],
  NO_FACE: ['no face', 'not present'],
} as const;

// Voice message templates organized by distraction type and escalation level
const VOICE_MESSAGES = {
  phone: {
    [ESCALATION_LEVEL.FIRST]: "Put down your phone and focus on your screen.",
    [ESCALATION_LEVEL.SECOND]: "Seriously, put that phone away. You're supposed to be working.",
    [ESCALATION_LEVEL.THIRD]: "Your phone is not more important than your goals. Put it down now.",
  },
  lookingAway: {
    [ESCALATION_LEVEL.FIRST]: "Look back at your screen, please.",
    [ESCALATION_LEVEL.SECOND]: "Your screen is right here. Look at it.",
    [ESCALATION_LEVEL.THIRD]: "Stop looking away and focus on your work.",
  },
  eyesClosed: {
    [ESCALATION_LEVEL.FIRST]: "Wake up! Open your eyes and focus.",
    [ESCALATION_LEVEL.SECOND]: "You're falling asleep. Wake up and get back to work.",
    [ESCALATION_LEVEL.THIRD]: "This is not nap time. Wake up and focus.",
  },
  awayFromDesk: {
    [ESCALATION_LEVEL.FIRST]: "Come back to your desk and focus on your screen.",
    [ESCALATION_LEVEL.SECOND]: "Where did you go? Get back to your screen.",
    [ESCALATION_LEVEL.THIRD]: "You're not even at your desk. Get back here and work.",
  },
  generic: {
    [ESCALATION_LEVEL.FIRST]: "You're getting distracted. Refocus on your screen.",
    [ESCALATION_LEVEL.SECOND]: "Stop getting distracted. Look at your screen.",
    [ESCALATION_LEVEL.THIRD]: "Enough distractions. Focus on your work now.",
  },
  default: "Please refocus on your screen.",
} as const;

/**
 * Checks if reason contains any of the given keywords
 */
function matchesPattern(reason: string, keywords: readonly string[]): boolean {
  const reasonLower = reason.toLowerCase();
  return keywords.some(keyword => reasonLower.includes(keyword));
}

/**
 * Detects if user is using phone based on reason text
 */
function isPhoneDetected(reason: string): boolean {
  return matchesPattern(reason, DISTRACTION_PATTERNS.PHONE);
}

/**
 * Detects if user is looking away based on reason text
 */
function isLookingAway(reason: string): boolean {
  const hasLookingKeyword = matchesPattern(reason, DISTRACTION_PATTERNS.LOOKING_AWAY);
  const hasDirectionKeyword = matchesPattern(reason, DISTRACTION_PATTERNS.LOOKING_DIRECTIONS);
  return hasLookingKeyword && hasDirectionKeyword;
}

/**
 * Detects if eyes are closed based on reason text
 */
function areEyesClosed(reason: string): boolean {
  const hasEyesKeyword = matchesPattern(reason, DISTRACTION_PATTERNS.EYES_CLOSED);
  const hasClosedState = matchesPattern(reason, DISTRACTION_PATTERNS.EYES_STATES);
  return hasEyesKeyword && hasClosedState;
}

/**
 * Detects if user is away from desk based on focus state and reason
 */
function isAwayFromDesk(focusState: FocusState, reason: string): boolean {
  if (focusState === 'idle') return true;
  return matchesPattern(reason, DISTRACTION_PATTERNS.NO_FACE);
}

/**
 * Gets the appropriate message for a distraction type and escalation level
 */
function getMessageForDistractionType(
  type: keyof typeof VOICE_MESSAGES,
  escalationLevel: number
): string {
  const messages = VOICE_MESSAGES[type];
  if (typeof messages === 'string') {
    return messages;
  }

  const level = escalationLevel as keyof typeof messages;
  return messages[level] || messages[ESCALATION_LEVEL.THIRD];
}

/**
 * Generates context-aware voice message based on focus state, reason, and escalation level
 */
export function generateContextualVoiceMessage(
  focusState: FocusState,
  reason: string,
  escalationLevel: number
): string {
  // Determine distraction type in priority order
  if (isPhoneDetected(reason)) {
    return getMessageForDistractionType('phone', escalationLevel);
  }

  if (isLookingAway(reason)) {
    return getMessageForDistractionType('lookingAway', escalationLevel);
  }

  if (areEyesClosed(reason)) {
    return getMessageForDistractionType('eyesClosed', escalationLevel);
  }

  if (isAwayFromDesk(focusState, reason)) {
    return getMessageForDistractionType('awayFromDesk', escalationLevel);
  }

  if (focusState === 'distracted') {
    return getMessageForDistractionType('generic', escalationLevel);
  }

  return VOICE_MESSAGES.default;
}

