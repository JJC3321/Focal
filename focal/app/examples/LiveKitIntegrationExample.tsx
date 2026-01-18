'use client';

/**
 * Example: How to integrate LiveKit with the existing Focal application
 * 
 * This example shows how to replace useWebcam with useWebcamWithLiveKit
 * to enable real-time video streaming to a server.
 */

import { useState, useCallback } from 'react';
import { useWebcamWithLiveKit } from '../hooks/useWebcamWithLiveKit';
import { useLiveKit } from '../hooks/useLiveKit';
import { useFocusDetection } from '../hooks/useFocusDetection';
import { useFocusStore } from '../store/focusStore';
import { LiveKitStatus } from '../components/LiveKitStatus';
import { WebcamView } from '../components/WebcamView';

export function LiveKitIntegrationExample() {
  const [enableLiveKit, setEnableLiveKit] = useState(false);
  const { isSessionActive, startSession, endSession, updateFocusState } = useFocusStore();

  const { videoRef, state: webcamState, startCamera, stopCamera } = useWebcamWithLiveKit({
    enableLiveKit,
    roomName: `focal-session-${Date.now()}`,
    participantName: 'User',
    onStreamingStateChange: (isStreaming) => {
      console.log('LiveKit streaming:', isStreaming);
    },
  });

  const { state: mediapipeState } = useFocusDetection({
    videoElement: videoRef.current,
    enabled: isSessionActive && webcamState.isActive,
    fps: 10,
    onStateChange: useCallback((state, reason) => {
      updateFocusState(state, reason);
    }, [updateFocusState]),
  });

  const handleStartSession = async () => {
    if (!webcamState.isActive) {
      await startCamera();
    }
    startSession();
  };

  const handleEndSession = () => {
    endSession();
    stopCamera();
  };

  return (
    <div className="space-y-4">
      {/* LiveKit Toggle */}
      <div className="glass-card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enableLiveKit}
            onChange={(e) => setEnableLiveKit(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm text-[var(--text-primary)]">
            Enable LiveKit Streaming (for remote processing)
          </span>
        </label>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          When enabled, video will be streamed to LiveKit server for low-latency remote processing.
        </p>
      </div>

      {/* LiveKit Status */}
      {enableLiveKit && (
        <LiveKitStatus
          isConnected={webcamState.liveKitConnected || false}
          isStreaming={webcamState.isStreaming || false}
          error={webcamState.liveKitError || null}
          participants={1}
        />
      )}

      {/* Webcam View */}
      <WebcamView
        videoRef={videoRef}
        state={webcamState}
        onStart={startCamera}
      />

      {/* Session Controls */}
      <div className="flex gap-4">
        {!isSessionActive ? (
          <button
            onClick={handleStartSession}
            className="btn-primary flex-1"
          >
            Start Session
          </button>
        ) : (
          <button
            onClick={handleEndSession}
            className="btn-secondary flex-1"
          >
            End Session
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Alternative: Using LiveKit directly for custom data streaming
 */
export function LiveKitDataStreamingExample() {
  const { state, publishData } = useLiveKit({
    enabled: true,
    roomName: 'data-stream',
    onDataReceived: (data, participant) => {
      const message = JSON.parse(new TextDecoder().decode(data));
      console.log('Received data:', message);
    },
  });

  const sendFocusUpdate = useCallback(async (focusState: string) => {
    const data = new TextEncoder().encode(
      JSON.stringify({
        type: 'focus-update',
        state: focusState,
        timestamp: Date.now(),
      })
    );
    await publishData(data, 'focus-updates');
  }, [publishData]);

  return (
    <div>
      <p>LiveKit Connected: {state.isConnected ? 'Yes' : 'No'}</p>
      <button onClick={() => sendFocusUpdate('focused')}>
        Send Focus Update
      </button>
    </div>
  );
}

