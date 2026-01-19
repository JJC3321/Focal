'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useLiveKit } from './useLiveKit';

export interface WebcamWithLiveKitState {
  isLoading: boolean;
  isActive: boolean;
  error: string | null;
  hasPermission: boolean | null;
  isStreaming: boolean;
}

export interface UseWebcamWithLiveKitOptions {
  enableLiveKit?: boolean;
  publishVideo?: boolean;
  roomName?: string;
  participantName?: string;
  onStreamingStateChange?: (isStreaming: boolean) => void;
  onUnexpectedStop?: () => void;
}

export function useWebcamWithLiveKit({
  enableLiveKit = false,
  publishVideo = true,
  roomName,
  participantName,
  onStreamingStateChange,
  onUnexpectedStop,
}: UseWebcamWithLiveKitOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publishedTracksRef = useRef<MediaStreamTrack[]>([]);
  const isStoppingRef = useRef(false); // Flag to track intentional stops
  const isMountedRef = useRef(true);

  const [state, setState] = useState<WebcamWithLiveKitState>({
    isLoading: false,
    isActive: false,
    error: null,
    hasPermission: null,
    isStreaming: false,
  });

  // Store callbacks in refs to avoid dependency issues
  const onUnexpectedStopRef = useRef(onUnexpectedStop);
  useEffect(() => {
    onUnexpectedStopRef.current = onUnexpectedStop;
  }, [onUnexpectedStop]);

  const {
    state: liveKitState,
    publishTrack,
    unpublishTrack,
  } = useLiveKit({
    enabled: enableLiveKit && state.isActive,
    roomName,
    participantName,
    onConnectionStateChange: (isConnected) => {
      if (isConnected && streamRef.current && enableLiveKit && publishVideo) {
        publishVideoTracks();
      }
    },
  });

  const publishVideoTracks = useCallback(async () => {
    if (!streamRef.current || !enableLiveKit || !publishVideo) {
      return;
    }

    try {
      const videoTracks = streamRef.current.getVideoTracks();

      for (const track of videoTracks) {
        await publishTrack(track);
        publishedTracksRef.current.push(track);
      }

      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isStreaming: true }));
        onStreamingStateChange?.(true);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Failed to publish video tracks:', error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: `Failed to stream: ${error.message}`,
        }));
      }
    }
  }, [enableLiveKit, publishVideo, publishTrack, onStreamingStateChange]);

  const startCamera = useCallback(async () => {
    isStoppingRef.current = false;
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
        audio: false,
      });

      streamRef.current = stream;

      // Add onended listener to detect unexpected camera stops
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach(track => {
        track.onended = () => {
          // Only handle if this wasn't an intentional stop
          if (!isStoppingRef.current && isMountedRef.current) {
            console.warn('Camera track ended unexpectedly');
            setState(prev => ({
              ...prev,
              isActive: false,
              error: 'Camera disconnected unexpectedly',
            }));
            onUnexpectedStopRef.current?.();
          }
        };

        // Also listen for mute events (some browsers use this instead of ended)
        track.onmute = () => {
          if (!isStoppingRef.current && isMountedRef.current) {
            console.warn('Camera track muted unexpectedly');
          }
        };
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (isMountedRef.current) {
        setState({
          isLoading: false,
          isActive: true,
          error: null,
          hasPermission: true,
          isStreaming: false,
        });
      }

      if (enableLiveKit && liveKitState.isConnected && publishVideo) {
        await publishVideoTracks();
      }
    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Failed to access camera';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
        if (isMountedRef.current) {
          setState(prev => ({ ...prev, hasPermission: false }));
        }
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isActive: false,
          error: errorMessage,
        }));
      }
    }
  }, [enableLiveKit, liveKitState.isConnected, publishVideoTracks, publishVideo]);

  const stopCamera = useCallback(async () => {
    // Mark that this is an intentional stop
    isStoppingRef.current = true;

    if (enableLiveKit) {
      for (const track of publishedTracksRef.current) {
        await unpublishTrack(track);
      }
      publishedTracksRef.current = [];
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isStreaming: false }));
        onStreamingStateChange?.(false);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.onended = null; // Remove listener before stopping
        track.onmute = null;
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isActive: false,
        isLoading: false,
      }));
    }
  }, [enableLiveKit, unpublishTrack, onStreamingStateChange]);

  useEffect(() => {
    if (enableLiveKit && state.isActive && liveKitState.isConnected && !state.isStreaming) {
      publishVideoTracks();
    }
  }, [enableLiveKit, state.isActive, liveKitState.isConnected, state.isStreaming, publishVideoTracks]);

  // Keep video playing even when tab is not focused
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden && streamRef.current) {
        // Tab is hidden - ensure video continues playing
        if (video.paused && streamRef.current) {
          video.play().catch(err => {
            console.warn('Failed to play video in background:', err);
          });
        }
        // Keep video tracks active
        streamRef.current?.getVideoTracks().forEach(track => {
          if (!track.enabled) {
            track.enabled = true;
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isActive]);

  // Track mount status for cleanup
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      // Only cleanup tracks if they exist and we're unmounting
      if (streamRef.current) {
        isStoppingRef.current = true; // Mark as intentional
        streamRef.current.getTracks().forEach(track => {
          track.onended = null;
          track.onmute = null;
          track.stop();
        });
        streamRef.current = null;
      }
    };
  }, []);

  return {
    videoRef,
    state: {
      ...state,
      liveKitConnected: liveKitState.isConnected,
      liveKitError: liveKitState.error,
    },
    startCamera,
    stopCamera,
  };
}
