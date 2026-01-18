'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { RealtimeVision } from '@overshoot/sdk';
import { FocusState } from '../lib/focusClassifier';

export interface OvershootDetectionState {
    isInitialized: boolean;
    isProcessing: boolean;
    error: string | null;
    currentState: FocusState;
    confidence: number;
    reason: string;
}

interface UseOvershootDetectionOptions {
    videoElement: HTMLVideoElement | null;
    enabled: boolean;
    apiKey: string;
    prompt?: string;
    onStateChange?: (state: FocusState, reason: string) => void;
}

const DEFAULT_PROMPT = "Is the user focused on the screen? Answer yes or no. If no, explain why.";

export function useOvershootDetection({
    videoElement,
    enabled,
    apiKey,
    prompt = DEFAULT_PROMPT,
    onStateChange,
}: UseOvershootDetectionOptions) {
    const visionRef = useRef<RealtimeVision | null>(null);
    const dataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<OvershootDetectionState>({
        isInitialized: false,
        isProcessing: false,
        error: null,
        currentState: 'unknown',
        confidence: 0,
        reason: 'Initializing AI...',
    });

    // Initialize Overshoot
    const initialize = useCallback(async () => {
        if (!apiKey) {
            setState(prev => ({ ...prev, error: 'API Key required' }));
            return;
        }

        try {
            setState(prev => ({ ...prev, isProcessing: true }));
            console.log('Initializing Overshoot with API URL:', 'https://cluster1.overshoot.ai/api/v0.2');

            visionRef.current = new RealtimeVision({
                apiKey: apiKey,
                apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
                prompt: prompt,
                onResult: (result: any) => {
                    // Clear timeout on data receipt
                    if (dataTimeoutRef.current) {
                        clearTimeout(dataTimeoutRef.current);
                        dataTimeoutRef.current = null;
                    }

                    console.log('Overshoot Result Received:', result);

                    let newState: FocusState = 'unknown';
                    let reason = 'Processing...';
                    let confidence = 0.8;

                    if (result) {
                        const data = result.data || result;

                        // Handle text response (since we simplified the prompt)
                        // Expected: "Yes" or "No, because..."
                        const text = (typeof data === 'string' ? data : JSON.stringify(data)).toLowerCase();

                        if (text.includes('yes')) {
                            newState = 'focused';
                            reason = 'Looking at screen';
                        } else if (text.includes('no')) {
                            if (text.includes('away') || text.includes('empty') || text.includes('no user')) {
                                newState = 'idle';
                            } else {
                                newState = 'distracted';
                            }
                            reason = text.replace(/no,?\s*/i, '').trim() || 'Distracted';
                        } else {
                            // Fallback for JSON if it still returns it
                            if (data.focused === true) newState = 'focused';
                            else if (data.focused === false) {
                                // If not focused, could be distracted or away
                                if (data.reason?.toLowerCase().includes('away') ||
                                    data.reason?.toLowerCase().includes('no user') ||
                                    data.reason?.toLowerCase().includes('empty')) {
                                    newState = 'idle';
                                } else {
                                    newState = 'distracted';
                                }
                            }
                            if (data.reason) reason = data.reason;
                        }
                    }

                    setState(prev => {
                        if (prev.currentState !== newState || prev.reason !== reason) {
                            onStateChange?.(newState, reason);
                        }
                        return {
                            ...prev,
                            currentState: newState,
                            confidence,
                            reason,
                            isProcessing: false,
                            error: null,
                        };
                    });
                },
                onError: (error: any) => {
                    console.error('Overshoot WebSocket Error:', error);
                    // Check for specific WebSocket close codes if available
                    if (error?.code === 1006) {
                        setState(prev => ({ ...prev, error: 'Connection closed unexpectedly (1006). Check API Key and Network.' }));
                    } else {
                        setState(prev => ({ ...prev, error: error.message || 'Stream error' }));
                    }
                }
            });

            setState(prev => ({
                ...prev,
                isInitialized: true,
                isProcessing: false,
                error: null,
            }));

        } catch (err: any) {
            console.error('Failed to initialize Overshoot:', err);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: err.message || 'Failed to initialize AI',
            }));
        }
    }, [apiKey, prompt, onStateChange]);

    // Start/Stop processing
    useEffect(() => {
        if (enabled && state.isInitialized && videoElement && visionRef.current) {
            console.log('Starting Overshoot stream...');
            console.log('SDK Instance:', visionRef.current);

            // Set a timeout to warn if no data is received within 10 seconds
            dataTimeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, error: 'No data received from AI. Check API Key or try refreshing.' }));
            }, 10000);

            // Try passing the video element explicitly, casting to any to bypass potential type definition issues
            (visionRef.current as any).start(videoElement).then(() => {
                console.log('Overshoot stream started successfully');
            }).catch((err: any) => {
                console.error('Failed to start Overshoot stream:', err);
                if (dataTimeoutRef.current) clearTimeout(dataTimeoutRef.current);
                setState(prev => ({ ...prev, error: `Failed to start video stream: ${err.message}` }));
            });
        } else if (!enabled && visionRef.current) {
            console.log('Stopping Overshoot stream...');
            if (dataTimeoutRef.current) clearTimeout(dataTimeoutRef.current);
            visionRef.current.stop();
        }

        return () => {
            visionRef.current?.stop();
            if (dataTimeoutRef.current) clearTimeout(dataTimeoutRef.current);
        };
    }, [enabled, state.isInitialized, videoElement]);

    // Initialize on mount/key change
    useEffect(() => {
        if (apiKey) {
            initialize();
        }

        return () => {
            visionRef.current?.stop();
        };
    }, [initialize, apiKey]);

    return {
        state,
        reinitialize: initialize,
    };
}
