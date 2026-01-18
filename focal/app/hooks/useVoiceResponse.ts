'use client';

import { useCallback, useRef, useEffect } from 'react';
import { FocusState } from '../lib/focusClassifier';
import { generateContextualVoiceMessage } from '../lib/voiceMessages';

export interface VoiceResponseOptions {
  enabled: boolean;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Default speech synthesis settings
const DEFAULT_SPEECH_SETTINGS = {
  RATE: 1.0,
  PITCH: 1.0,
  VOLUME: 0.8,
} as const;

// Preferred voice names for coaching tone (female voices)
const PREFERRED_VOICE_NAMES = [
  'Samantha',
  'Karen',
  'Victoria',
  'Zira',
  'Google UK English Female',
  'Microsoft Zira',
] as const;

// Escalation check interval in milliseconds
const ESCALATION_CHECK_INTERVAL = 500;

/**
 * Selects the best available voice for speech synthesis
 */
function selectVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const preferredVoice = voices.find(voice =>
    PREFERRED_VOICE_NAMES.some(name => voice.name.includes(name))
  );

  return preferredVoice || voices[2];
}

/**
 * Initializes speech synthesis and loads available voices
 */
function initializeSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const synthesis = window.speechSynthesis;

  const loadVoices = () => {
    synthesis.getVoices();
  };

  loadVoices();
  if (synthesis.onvoiceschanged !== undefined) {
    synthesis.onvoiceschanged = loadVoices;
  }

  return synthesis;
}

/**
 * Hook for context-aware voice responses using Web Speech API
 */
export function useVoiceResponse(options: VoiceResponseOptions) {
  const {
    enabled,
    rate = DEFAULT_SPEECH_SETTINGS.RATE,
    pitch = DEFAULT_SPEECH_SETTINGS.PITCH,
    volume = DEFAULT_SPEECH_SETTINGS.VOLUME,
  } = options;

  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);

  useEffect(() => {
    speechSynthesisRef.current = initializeSpeechSynthesis();
  }, []);

  const createUtterance = useCallback(
    (text: string): SpeechSynthesisUtterance | null => {
      if (!speechSynthesisRef.current) return null;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      const voices = speechSynthesisRef.current.getVoices();
      const selectedVoice = selectVoice(voices);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      return utterance;
    },
    [rate, pitch, volume]
  );

  const setupUtteranceCallbacks = useCallback(
    (utterance: SpeechSynthesisUtterance) => {
      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
      };

      utterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        isSpeakingRef.current = false;
      };
    },
    []
  );

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !speechSynthesisRef.current || isSpeakingRef.current) {
        return;
      }

      try {
        speechSynthesisRef.current.cancel();

        const utterance = createUtterance(text);
        if (!utterance) return;

        setupUtteranceCallbacks(utterance);
        speechSynthesisRef.current.speak(utterance);
      } catch (error) {
        console.error('Failed to speak:', error);
        isSpeakingRef.current = false;
      }
    },
    [enabled, createUtterance, setupUtteranceCallbacks]
  );

  const speakContextualMessage = useCallback(
    (focusState: FocusState, reason: string, escalationLevel: number) => {
      if (!enabled) return;

      const message = generateContextualVoiceMessage(focusState, reason, escalationLevel);
      speak(message);
    },
    [enabled, speak]
  );

  const stop = useCallback(() => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      isSpeakingRef.current = false;
    }
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    speak,
    speakContextualMessage,
    stop,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window,
  };
}
