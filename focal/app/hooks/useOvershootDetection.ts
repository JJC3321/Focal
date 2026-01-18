'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { RealtimeVision } from '@overshoot/sdk';
import { FocusState } from '../lib/focusClassifier';

export interface OvershootAnalysis {
    focused: boolean;
    state: FocusState;
    reason: string;
    confidence: number;
    thinking?: string;
}

export interface OvershootDetectionState {
    isInitialized: boolean;
    isProcessing: boolean;
    error: string | null;
    lastAnalysis: OvershootAnalysis | null;
}

interface UseOvershootDetectionOptions {
    videoElement: HTMLVideoElement | null;
    enabled: boolean;
    apiKey: string;
    prompt?: string;
    onAnalysis?: (analysis: OvershootAnalysis) => void;
}

const DEFAULT_PROMPT = "Analyze if the user is focused on the screen. Determine their focus state and provide a reason.";

const OUTPUT_SCHEMA = {
    type: 'object',
    properties: {
        focused: {
            type: 'boolean',
            description: 'Whether the user is focused on the screen'
        },
        state: {
            type: 'string',
            enum: ['focused', 'distracted', 'idle'],
            description: 'The current focus state: focused (looking at screen), distracted (looking elsewhere), or idle (no user present)'
        },
        reason: {
            type: 'string',
            description: 'Explanation for the focus state determination'
        },
        confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence level of the detection (0 to 1)'
        }
    },
    required: ['focused', 'state', 'reason']
};

export function useOvershootDetection({
    videoElement,
    enabled,
    apiKey,
    prompt = DEFAULT_PROMPT,
    onAnalysis,
}: UseOvershootDetectionOptions) {
    const visionRef = useRef<RealtimeVision | null>(null);
    const dataTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [state, setState] = useState<OvershootDetectionState>({
        isInitialized: false,
        isProcessing: false,
        error: null,
        lastAnalysis: null,
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
                outputSchema: OUTPUT_SCHEMA,
                onResult: (result: any) => {
                    // Clear timeout on data receipt
                    if (dataTimeoutRef.current) {
                        clearTimeout(dataTimeoutRef.current);
                        dataTimeoutRef.current = null;
                    }

                    console.log('Overshoot Result Received:', result);

                    if (result && result.result) {
                        try {
                            // Parse structured JSON output from result.result
                            const data = JSON.parse(result.result);

                            let analysisState: FocusState = 'unknown';
                            let reason = 'Processing...';
                            let confidence = 0.8;

                            // Validate and use structured data
                            if (data.state && ['focused', 'distracted', 'idle'].includes(data.state)) {
                                analysisState = data.state as FocusState;
                            } else if (data.focused === true) {
                                analysisState = 'focused';
                            } else if (data.focused === false) {
                                // Determine if idle or distracted based on reason
                                const reasonLower = (data.reason || '').toLowerCase();
                                if (reasonLower.includes('away') || 
                                    reasonLower.includes('no user') || 
                                    reasonLower.includes('empty') ||
                                    reasonLower.includes('not present')) {
                                    analysisState = 'idle';
                                } else {
                                    analysisState = 'distracted';
                                }
                            }

                            // Use provided reason or generate default
                            reason = data.reason || (analysisState === 'focused' ? 'Looking at screen' : 'Not focused');
                            
                            // Use provided confidence or default
                            if (typeof data.confidence === 'number') {
                                confidence = Math.max(0, Math.min(1, data.confidence));
                            }

                            // Create analysis object
                            const analysis: OvershootAnalysis = {
                                focused: data.focused ?? (analysisState === 'focused'),
                                state: analysisState,
                                reason: reason,
                                confidence: confidence,
                                thinking: data.reason, // The reason serves as the "thinking"
                            };

                            // Store analysis and notify MediaPipe
                            setState(prev => ({
                                ...prev,
                                lastAnalysis: analysis,
                                isProcessing: false,
                                error: null,
                            }));

                            // Pass analysis to MediaPipe via callback
                            onAnalysis?.(analysis);
                        } catch (parseError) {
                            console.error('Failed to parse Overshoot result:', parseError);
                            console.error('Raw result:', result.result);
                            setState(prev => ({
                                ...prev,
                                error: 'Failed to parse AI response',
                                isProcessing: false,
                            }));
                            return;
                        }
                    } else {
                        console.warn('Unexpected result format:', result);
                    }
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
    }, [apiKey, prompt, onAnalysis]);

    // Start/Stop processing
    useEffect(() => {
        if (enabled && state.isInitialized && videoElement && visionRef.current) {
            console.log('Starting Overshoot stream...');
            console.log('SDK Instance:', visionRef.current);

            // Set a timeout to warn if no data is received within 10 seconds
            dataTimeoutRef.current = setTimeout(() => {
                setState(prev => ({ ...prev, error: 'No data received from AI. Check API Key or try refreshing.' }));
            }, 10000);

            // Start the vision stream (SDK manages camera internally)
            visionRef.current.start().then(() => {
                console.log('Overshoot stream started successfully');
                setState(prev => ({
                    ...prev,
                    isProcessing: false,
                }));
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
