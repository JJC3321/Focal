/**
 * Focus state types and classifier logic
 * Determines user's attention state based on face landmarks and head pose
 */

export type FocusState =
    | 'focused'           // Looking at screen
    | 'distracted'        // Looking away from screen
    | 'idle'              // No face detected / away from desk
    | 'unknown';          // Insufficient data

export interface HeadPose {
    yaw: number;    // Horizontal rotation (-90 to 90, 0 = facing camera)
    pitch: number;  // Vertical tilt (-90 to 90, 0 = level)
    roll: number;   // Head tilt (-180 to 180, 0 = upright)
}

export interface OvershootAnalysis {
    focused: boolean;
    state: FocusState;
    reason: string;
    confidence: number;
    thinking?: string;
}

export interface FocusClassifierInput {
    faceDetected: boolean;
    headPose: HeadPose | null;
    eyesOpen: boolean;
    confidence: number;
    overshootAnalysis?: OvershootAnalysis | null;
}

export interface FocusClassifierResult {
    state: FocusState;
    confidence: number;
    reason: string;
}

// Thresholds for classification (in degrees)
const THRESHOLDS = {
    // Max yaw angle before considered "looking away"
    YAW_DISTRACTED: 25,
    // Max pitch angle (looking up/down too much)
    PITCH_DISTRACTED: 20,
    // Minimum face detection confidence
    MIN_CONFIDENCE: 0.5,
};

/**
 * Classifies focus state from face detection data, incorporating Overshoot AI analysis
 */
export function classifyFocusState(input: FocusClassifierInput): FocusClassifierResult {
    // If Overshoot analysis is available, use it to inform MediaPipe's decision
    const overshootAnalysis = input.overshootAnalysis;
    
    // No face detected = idle (unless Overshoot says otherwise with high confidence)
    if (!input.faceDetected) {
        if (overshootAnalysis && overshootAnalysis.confidence > 0.8 && overshootAnalysis.state === 'focused') {
            // Overshoot might detect focus even when MediaPipe doesn't see face clearly
            return {
                state: 'focused',
                confidence: overshootAnalysis.confidence * 0.7, // Slightly lower confidence
                reason: `AI: ${overshootAnalysis.reason}`,
            };
        }
        return {
            state: 'idle',
            confidence: 1.0,
            reason: 'No face detected in frame',
        };
    }

    // Low confidence detection
    if (input.confidence < THRESHOLDS.MIN_CONFIDENCE) {
        // If Overshoot has high confidence, trust it more
        if (overshootAnalysis && overshootAnalysis.confidence > 0.7) {
            return {
                state: overshootAnalysis.state,
                confidence: overshootAnalysis.confidence * 0.8,
                reason: `AI: ${overshootAnalysis.reason}`,
            };
        }
        return {
            state: 'unknown',
            confidence: input.confidence,
            reason: 'Face detection confidence too low',
        };
    }

    // No head pose data available
    if (!input.headPose) {
        // Fall back to Overshoot if available
        if (overshootAnalysis) {
            return {
                state: overshootAnalysis.state,
                confidence: overshootAnalysis.confidence * 0.9,
                reason: `AI: ${overshootAnalysis.reason}`,
            };
        }
        return {
            state: 'unknown',
            confidence: 0.5,
            reason: 'Head pose estimation unavailable',
        };
    }

    const { yaw, pitch } = input.headPose;
    const absYaw = Math.abs(yaw);
    const absPitch = Math.abs(pitch);

    // MediaPipe's detection
    let mediapipeState: FocusState = 'focused';
    let mediapipeConfidence = input.confidence;
    let mediapipeReason = 'Looking at screen';

    // Check for distraction based on head pose
    if (absYaw > THRESHOLDS.YAW_DISTRACTED) {
        mediapipeState = 'distracted';
        mediapipeConfidence = Math.min(1, absYaw / 45);
        mediapipeReason = `Looking ${yaw > 0 ? 'right' : 'left'} (${Math.round(absYaw)}°)`;
    } else if (absPitch > THRESHOLDS.PITCH_DISTRACTED) {
        mediapipeState = 'distracted';
        mediapipeConfidence = Math.min(1, absPitch / 40);
        mediapipeReason = `Looking ${pitch > 0 ? 'down' : 'up'} (${Math.round(absPitch)}°)`;
    } else if (!input.eyesOpen) {
        mediapipeState = 'distracted';
        mediapipeConfidence = 0.6;
        mediapipeReason = 'Eyes appear closed';
    }

    // Combine MediaPipe and Overshoot analysis
    if (overshootAnalysis) {
        // If both agree, increase confidence
        if (mediapipeState === overshootAnalysis.state) {
            const combinedConfidence = Math.min(1, (mediapipeConfidence + overshootAnalysis.confidence) / 2);
            return {
                state: mediapipeState,
                confidence: combinedConfidence,
                reason: `${mediapipeReason} | AI: ${overshootAnalysis.reason}`,
            };
        }
        
        // If they disagree, use weighted average based on confidence
        // Higher confidence wins, but we blend the reasons
        if (overshootAnalysis.confidence > mediapipeConfidence) {
            return {
                state: overshootAnalysis.state,
                confidence: (overshootAnalysis.confidence * 0.7 + mediapipeConfidence * 0.3),
                reason: `AI: ${overshootAnalysis.reason} (MediaPipe: ${mediapipeReason})`,
            };
        } else {
            return {
                state: mediapipeState,
                confidence: (mediapipeConfidence * 0.7 + overshootAnalysis.confidence * 0.3),
                reason: `${mediapipeReason} (AI: ${overshootAnalysis.reason})`,
            };
        }
    }

    // No Overshoot analysis, use MediaPipe only
    return {
        state: mediapipeState,
        confidence: mediapipeConfidence,
        reason: mediapipeReason,
    };
}

/**
 * Calculates head pose angles from MediaPipe face landmarks
 * Uses key facial landmarks to estimate 3D head orientation
 */
export function calculateHeadPose(
    landmarks: Array<{ x: number; y: number; z: number }>
): HeadPose | null {
    if (!landmarks || landmarks.length < 468) {
        return null;
    }

    try {
        // Key landmark indices from MediaPipe Face Mesh
        const noseTip = landmarks[1];        // Nose tip
        const noseBridge = landmarks[6];     // Nose bridge
        const leftEye = landmarks[33];       // Left eye inner corner
        const rightEye = landmarks[263];     // Right eye inner corner
        const leftMouth = landmarks[61];     // Left mouth corner
        const rightMouth = landmarks[291];   // Right mouth corner

        // Calculate yaw (horizontal rotation) from nose position relative to eyes
        const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2,
            z: (leftEye.z + rightEye.z) / 2,
        };

        // Z-difference indicates head turn
        const yaw = Math.atan2(noseTip.z - eyeCenter.z, 0.1) * (180 / Math.PI);

        // Calculate pitch (vertical tilt) from nose tip to bridge
        const noseVector = {
            y: noseTip.y - noseBridge.y,
            z: noseTip.z - noseBridge.z,
        };
        const pitch = Math.atan2(noseVector.z, noseVector.y) * (180 / Math.PI);

        // Calculate roll from eye positions
        const eyeDeltaY = rightEye.y - leftEye.y;
        const eyeDeltaX = rightEye.x - leftEye.x;
        const roll = Math.atan2(eyeDeltaY, eyeDeltaX) * (180 / Math.PI);

        // Use mouth corners for additional yaw calculation (more robust)
        const mouthCenter = {
            x: (leftMouth.x + rightMouth.x) / 2,
        };
        const noseToMouthOffset = noseTip.x - mouthCenter.x;
        const yawFromMouth = noseToMouthOffset * 180; // Approximate yaw from 2D offset

        // Blend the two yaw estimates
        const finalYaw = (yaw * 0.3 + yawFromMouth * 0.7);

        return {
            yaw: clamp(finalYaw, -90, 90),
            pitch: clamp(pitch, -90, 90),
            roll: clamp(roll, -180, 180),
        };
    } catch {
        return null;
    }
}

/**
 * Estimates if eyes are open based on eye aspect ratio
 */
export function areEyesOpen(
    landmarks: Array<{ x: number; y: number; z: number }>
): boolean {
    if (!landmarks || landmarks.length < 468) {
        return true; // Default to open if can't detect
    }

    try {
        // Left eye landmarks
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const leftEyeLeft = landmarks[33];
        const leftEyeRight = landmarks[133];

        // Right eye landmarks
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];
        const rightEyeLeft = landmarks[362];
        const rightEyeRight = landmarks[263];

        // Calculate Eye Aspect Ratio (EAR)
        const leftEAR = calculateEAR(leftEyeTop, leftEyeBottom, leftEyeLeft, leftEyeRight);
        const rightEAR = calculateEAR(rightEyeTop, rightEyeBottom, rightEyeLeft, rightEyeRight);

        const avgEAR = (leftEAR + rightEAR) / 2;

        // Threshold for closed eyes (typically around 0.2)
        return avgEAR > 0.15;
    } catch {
        return true;
    }
}

function calculateEAR(
    top: { x: number; y: number },
    bottom: { x: number; y: number },
    left: { x: number; y: number },
    right: { x: number; y: number }
): number {
    const verticalDist = Math.sqrt(
        Math.pow(top.x - bottom.x, 2) + Math.pow(top.y - bottom.y, 2)
    );
    const horizontalDist = Math.sqrt(
        Math.pow(left.x - right.x, 2) + Math.pow(left.y - right.y, 2)
    );

    return horizontalDist > 0 ? verticalDist / horizontalDist : 0;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
