'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import {
    FaceDetector,
    FaceLandmarker,
    FilesetResolver,
} from '@mediapipe/tasks-vision';
import {
    FocusState,
    classifyFocusState,
    calculateHeadPose,
    areEyesOpen,
    OvershootAnalysis,
} from '../lib/focusClassifier';

export interface FocusDetectionState {
    isInitialized: boolean;
    isProcessing: boolean;
    error: string | null;
    currentState: FocusState;
    confidence: number;
    reason: string;
}

interface UseFocusDetectionOptions {
    videoElement: HTMLVideoElement | null;
    enabled: boolean;
    fps?: number; // Processing framerate (default 10)
    overshootAnalysis?: OvershootAnalysis | null; // Overshoot AI analysis to inform classification
    onStateChange?: (state: FocusState, reason: string) => void;
}

export function useFocusDetection({
    videoElement,
    enabled,
    fps = 10,
    overshootAnalysis = null,
    onStateChange,
}: UseFocusDetectionOptions) {
    const faceDetectorRef = useRef<FaceDetector | null>(null);
    const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastProcessTimeRef = useRef<number>(0);

    const [state, setState] = useState<FocusDetectionState>({
        isInitialized: false,
        isProcessing: false,
        error: null,
        currentState: 'unknown',
        confidence: 0,
        reason: 'Initializing...',
    });

    // Initialize MediaPipe models
    const initialize = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, isProcessing: true }));

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
            );

            // Initialize Face Detector
            faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                minDetectionConfidence: 0.5,
            });

            // Initialize Face Landmarker for detailed pose estimation
            faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath:
                        'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numFaces: 1,
                minFaceDetectionConfidence: 0.5,
                minFacePresenceConfidence: 0.5,
                minTrackingConfidence: 0.5,
                outputFaceBlendshapes: false,
                outputFacialTransformationMatrixes: false,
            });

            setState(prev => ({
                ...prev,
                isInitialized: true,
                isProcessing: false,
                error: null,
            }));
        } catch (err) {
            console.error('Failed to initialize MediaPipe:', err);
            setState(prev => ({
                ...prev,
                isProcessing: false,
                error: 'Failed to load face detection models',
            }));
        }
    }, []);

    // Process a single frame
    const processFrame = useCallback(
        (timestamp: number) => {
            if (
                !videoElement ||
                !faceDetectorRef.current ||
                !faceLandmarkerRef.current ||
                !enabled
            ) {
                return;
            }

            // Throttle processing based on desired FPS
            const frameInterval = 1000 / fps;
            if (timestamp - lastProcessTimeRef.current < frameInterval) {
                animationFrameRef.current = requestAnimationFrame(processFrame);
                return;
            }
            lastProcessTimeRef.current = timestamp;

            try {
                // Detect face landmarks
                const landmarkerResult = faceLandmarkerRef.current.detectForVideo(
                    videoElement,
                    timestamp
                );

                const faceDetected = landmarkerResult.faceLandmarks.length > 0;
                let headPose = null;
                let eyesOpen = true;
                let confidence = 0;

                if (faceDetected && landmarkerResult.faceLandmarks[0]) {
                    const landmarks = landmarkerResult.faceLandmarks[0];
                    headPose = calculateHeadPose(landmarks);
                    eyesOpen = areEyesOpen(landmarks);
                    confidence = 0.9; // MediaPipe doesn't expose confidence per landmark
                }

                // Classify focus state, incorporating Overshoot analysis
                const result = classifyFocusState({
                    faceDetected,
                    headPose,
                    eyesOpen,
                    confidence,
                    overshootAnalysis,
                });

                // Update state
                setState(prev => {
                    if (
                        prev.currentState !== result.state ||
                        prev.reason !== result.reason
                    ) {
                        onStateChange?.(result.state, result.reason);
                    }
                    return {
                        ...prev,
                        currentState: result.state,
                        confidence: result.confidence,
                        reason: result.reason,
                    };
                });
            } catch (err) {
                console.error('Frame processing error:', err);
            }

            // Continue processing
            animationFrameRef.current = requestAnimationFrame(processFrame);
        },
        [videoElement, enabled, fps, overshootAnalysis, onStateChange]
    );

    // Start/stop processing based on enabled state
    useEffect(() => {
        if (enabled && state.isInitialized && videoElement) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
        }

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, state.isInitialized, videoElement, processFrame]);

    // Initialize on mount
    useEffect(() => {
        initialize();

        return () => {
            // Cleanup
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            faceDetectorRef.current?.close();
            faceLandmarkerRef.current?.close();
        };
    }, [initialize]);

    return {
        state,
        reinitialize: initialize,
    };
}
