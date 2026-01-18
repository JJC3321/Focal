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
  roomName?: string;
  participantName?: string;
  onStreamingStateChange?: (isStreaming: boolean) => void;
}

export function useWebcamWithLiveKit({
  enableLiveKit = false,
  roomName,
  participantName,
  onStreamingStateChange,
}: UseWebcamWithLiveKitOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const publishedTracksRef = useRef<MediaStreamTrack[]>([]);

  const [state, setState] = useState<WebcamWithLiveKitState>({
    isLoading: false,
    isActive: false,
    error: null,
    hasPermission: null,
    isStreaming: false,
  });

  const {
    state: liveKitState,
    publishTrack,
    unpublishTrack,
  } = useLiveKit({
    enabled: enableLiveKit && state.isActive,
    roomName,
    participantName,
    onConnectionStateChange: (isConnected) => {
      if (isConnected && streamRef.current && enableLiveKit) {
        publishVideoTracks();
      }
    },
  });

  const publishVideoTracks = useCallback(async () => {
    if (!streamRef.current || !enableLiveKit) {
      return;
    }

    try {
      const videoTracks = streamRef.current.getVideoTracks();
      
      for (const track of videoTracks) {
        await publishTrack(track);
        publishedTracksRef.current.push(track);
      }

      setState(prev => ({ ...prev, isStreaming: true }));
      onStreamingStateChange?.(true);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to publish video tracks:', error);
      setState(prev => ({
        ...prev,
        error: `Failed to stream: ${error.message}`,
      }));
    }
  }, [enableLiveKit, publishTrack, onStreamingStateChange]);

  const startCamera = useCallback(async () => {
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState({
        isLoading: false,
        isActive: true,
        error: null,
        hasPermission: true,
        isStreaming: false,
      });

      if (enableLiveKit && liveKitState.isConnected) {
        await publishVideoTracks();
      }
    } catch (err) {
      const error = err as Error;
      let errorMessage = 'Failed to access camera';

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access.';
        setState(prev => ({ ...prev, hasPermission: false }));
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found. Please connect a camera.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera is in use by another application.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isActive: false,
        error: errorMessage,
      }));
    }
  }, [enableLiveKit, liveKitState.isConnected, publishVideoTracks]);

  const stopCamera = useCallback(async () => {
    if (enableLiveKit) {
      for (const track of publishedTracksRef.current) {
        await unpublishTrack(track);
      }
      publishedTracksRef.current = [];
      setState(prev => ({ ...prev, isStreaming: false }));
      onStreamingStateChange?.(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      isLoading: false,
    }));
  }, [enableLiveKit, unpublishTrack, onStreamingStateChange]);

  useEffect(() => {
    if (enableLiveKit && state.isActive && liveKitState.isConnected && !state.isStreaming) {
      publishVideoTracks();
    }
  }, [enableLiveKit, state.isActive, liveKitState.isConnected, state.isStreaming, publishVideoTracks]);

  // Keep video playing even when tab is not focused
  useEffect(() => {
    if (!videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - ensure video continues playing
        if (video.paused) {
          video.play().catch(err => {
            console.warn('Failed to play video in background:', err);
          });
        }
        // Keep video tracks active
        streamRef.current?.getVideoTracks().forEach(track => {
          if (track.readyState === 'paused') {
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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
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

