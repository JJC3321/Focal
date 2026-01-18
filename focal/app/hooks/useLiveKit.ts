'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track, RemoteTrack, RemoteVideoTrack, RemoteAudioTrack } from 'livekit-client';

export interface LiveKitState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  roomName: string | null;
  participants: number;
}

export interface UseLiveKitOptions {
  enabled?: boolean;
  roomName?: string;
  participantName?: string;
  onTrackReceived?: (track: RemoteTrack, participant: any) => void;
  onDataReceived?: (data: Uint8Array, participant: any) => void;
  onConnectionStateChange?: (isConnected: boolean) => void;
}

const DEFAULT_ROOM_NAME = 'focal-session';

export function useLiveKit({
  enabled = false,
  roomName = DEFAULT_ROOM_NAME,
  participantName,
  onTrackReceived,
  onDataReceived,
  onConnectionStateChange,
}: UseLiveKitOptions = {}) {
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<LiveKitState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    roomName: null,
    participants: 0,
  });

  // Use refs for callbacks to avoid dependency loops
  const onTrackReceivedRef = useRef(onTrackReceived);
  const onDataReceivedRef = useRef(onDataReceived);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);

  useEffect(() => {
    onTrackReceivedRef.current = onTrackReceived;
    onDataReceivedRef.current = onDataReceived;
    onConnectionStateChangeRef.current = onConnectionStateChange;
  }, [onTrackReceived, onDataReceived, onConnectionStateChange]);

  const connect = useCallback(async () => {
    if (roomRef.current?.state === 'connected') {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          participantName: participantName || 'User',
          participantIdentity: `user-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get token');
      }

      const { token, url } = await response.json();

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: any, participant: any) => {
        if (onTrackReceivedRef.current) {
          onTrackReceivedRef.current(track, participant);
        }
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant: any) => {
        if (onDataReceivedRef.current) {
          onDataReceivedRef.current(payload, participant);
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setState(prev => ({
          ...prev,
          participants: room.remoteParticipants.size + 1,
        }));
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setState(prev => ({
          ...prev,
          participants: room.remoteParticipants.size + 1,
        }));
      });

      await room.connect(url, token);

      roomRef.current = room;

      setState({
        isConnected: true,
        isConnecting: false,
        error: null,
        roomName,
        participants: room.remoteParticipants.size + 1,
      });

      onConnectionStateChangeRef.current?.(true);
    } catch (err) {
      const error = err as Error;
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: error.message || 'Failed to connect to LiveKit',
      }));
      onConnectionStateChangeRef.current?.(false);
    }
  }, [roomName, participantName]);

  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setState(prev => {
      if (!prev.isConnected && !prev.isConnecting && !prev.error) return prev;
      return {
        isConnected: false,
        isConnecting: false,
        error: null,
        roomName: null,
        participants: 0,
      };
    });

    onConnectionStateChangeRef.current?.(false);
  }, []);

  const publishTrack = useCallback(async (track: MediaStreamTrack) => {
    if (!roomRef.current || roomRef.current.state !== 'connected') {
      throw new Error('Room not connected');
    }

    await roomRef.current.localParticipant.publishTrack(track, {
      source: Track.Source.Camera,
    });
  }, []);

  const publishData = useCallback(async (data: Uint8Array, topic?: string) => {
    if (!roomRef.current || roomRef.current.state !== 'connected') {
      throw new Error('Room not connected');
    }

    await roomRef.current.localParticipant.publishData(data, {
      topic,
      reliable: true,
    });
  }, []);

  const unpublishTrack = useCallback(async (track: MediaStreamTrack) => {
    if (!roomRef.current || roomRef.current.state !== 'connected') {
      return;
    }

    const publication = Array.from(roomRef.current.localParticipant.trackPublications.values()).find(
      pub => pub.track === track
    );

    if (publication) {
      await roomRef.current.localParticipant.unpublishTrack(track);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect]); // Removed disconnect to prevent loop

  return {
    state,
    room: roomRef.current,
    connect,
    disconnect,
    publishTrack,
    publishData,
    unpublishTrack,
  };
}

