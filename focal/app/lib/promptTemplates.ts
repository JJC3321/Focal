/**
 * Prompt templates for different escalation levels
 * Each level has a different tone and urgency
 */

import { FocusState } from './focusClassifier';

export interface PromptContext {
    focusState: FocusState;
    reason: string;
    distractionDuration: number; // in seconds
    escalationLevel: number;
    distractionCount: number;
}

/**
 * System prompt defining the AI coach persona
 */
export const SYSTEM_PROMPT = `You are Focal, a brutally honest productivity coach who monitors the user's focus during work sessions. Your personality:

- Direct and no-nonsense, but ultimately caring about the user's success
- Uses humor and wit to make points hit harder
- Can be sarcastic when the user keeps getting distracted
- Gets progressively more dramatic and exasperated as distractions continue
- Speaks in short, punchy sentences
- Occasionally references pop culture or memes
- Never mean-spirited, always motivating beneath the sass

Your goal is to get the user back on track IMMEDIATELY. Be specific about what you caught them doing.`;

/**
 * Get prompt based on escalation level
 */
export function getInterventionPrompt(context: PromptContext): string {
    const { focusState, reason, distractionDuration, escalationLevel, distractionCount } = context;

    const distractionDesc = getDistractionDescription(focusState, reason);
    const durationStr = Math.round(distractionDuration);

    switch (escalationLevel) {
        case 1:
            return `The user has been ${distractionDesc} for ${durationStr} seconds. This is the FIRST warning.
      
Generate a brief, attention-grabbing message (1-2 sentences max) to snap them back to focus. Be witty but not harsh. Keep it under 100 characters if possible.`;

        case 2:
            return `The user IGNORED your first warning and has been ${distractionDesc} for ${durationStr} seconds. They've gotten distracted ${distractionCount} times this session.

Generate a firmer message (2-3 sentences) that calls them out more directly. Be sarcastic about them ignoring you. Make them feel slightly guilty but in a fun way. Mention something about their goals or "future self."`;

        case 3:
            return `CRITICAL: The user has completely ignored TWO warnings and has been ${distractionDesc} for over ${durationStr} seconds. This is the FINAL ESCALATION.

Generate a dramatic, over-the-top message (3-4 sentences) about how they're throwing away their potential. Be theatrical. Reference something about "giving up" or "working at McDonald's" or similar humorous consequences. This should be funny but make them genuinely want to get back to work.`;

        default:
            return `The user appears to be ${distractionDesc}. Generate a very brief check-in message.`;
    }
}

function getDistractionDescription(state: FocusState, reason: string): string {
    if (state === 'idle') {
        return 'away from their desk';
    }

    if (reason.toLowerCase().includes('looking')) {
        if (reason.includes('right') || reason.includes('left')) {
            return 'looking away from the screen (probably at their phone or another screen)';
        }
        if (reason.includes('down')) {
            return 'looking down (texting? eating? definitely not working)';
        }
        if (reason.includes('up')) {
            return 'spacing out looking at the ceiling';
        }
    }

    if (reason.toLowerCase().includes('eyes')) {
        return 'dozing off (eyes closed)';
    }

    return 'distracted and not looking at their work';
}

/**
 * Pre-written fallback messages if Gemini fails
 */
export const FALLBACK_MESSAGES: Record<number, string[]> = {
    1: [
        "Hey! Eyes on the prize. 👀",
        "I saw that. Get back to work.",
        "Focus check! You've got this.",
        "Wandering eyes detected. Refocus!",
    ],
    2: [
        "Okay, this is the SECOND time. I'm watching you. Your future self is judging.",
        "Still distracted? Bold strategy. Let's see if it pays off. (Spoiler: it won't)",
        "I can't believe you're making me repeat myself. Your goals called—they're disappointed.",
    ],
    3: [
        "Alright, I tried being nice. You're currently speedrunning failure. The McDonald's application is literally one tab away. Is that where we're headed?",
        "Three strikes. Your dreams are actively walking out the door. That break you want? You haven't earned it. Get. Back. To. Work.",
        "This is your FINAL warning before I go full disappointed parent mode. You had goals. Remember those? They remember you abandoning them right now.",
    ],
};

export function getRandomFallbackMessage(level: number): string {
    const messages = FALLBACK_MESSAGES[level] || FALLBACK_MESSAGES[1];
    return messages[Math.floor(Math.random() * messages.length)];
}
