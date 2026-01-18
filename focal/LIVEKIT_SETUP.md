# LiveKit Integration Setup

This document explains how to set up and use LiveKit for real-time video/data streaming in the Focal application.

## Overview

LiveKit enables low-latency real-time communication between the client and server, allowing for:
- Real-time video streaming from client to server
- Remote model execution on server-side
- Bidirectional data communication
- Scalable infrastructure for multiple concurrent sessions

## Prerequisites

1. **LiveKit Server**: You need a LiveKit server instance running. Options:
   - Self-hosted: [LiveKit Server](https://docs.livekit.io/home/self-hosting/)
   - Cloud: [LiveKit Cloud](https://cloud.livekit.io/)

2. **Environment Variables**: Add the following to your `.env.local` file:

```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com

# For local development:
# NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
```

## Installation

The required dependencies are already installed:
- `livekit-client`: Client SDK for browser
- `livekit-server-sdk`: Server SDK for token generation

## Architecture

### Client-Side Components

1. **`useLiveKit` Hook** (`app/hooks/useLiveKit.ts`)
   - Manages LiveKit room connection
   - Handles token acquisition
   - Publishes/subscribes to tracks and data
   - Manages connection state

2. **`useWebcamWithLiveKit` Hook** (`app/hooks/useWebcamWithLiveKit.ts`)
   - Extends webcam functionality with LiveKit streaming
   - Automatically publishes video tracks when connected
   - Manages streaming state

### Server-Side Components

1. **Token Generation API** (`app/api/livekit/token/route.ts`)
   - Generates secure access tokens for clients
   - Configures room permissions
   - Returns connection URL and token

2. **Frame Processing API** (`app/api/livekit/process/route.ts`)
   - Optional endpoint for server-side frame processing
   - Can be extended to run ML models remotely

## Usage

### Basic Integration

```typescript
import { useWebcamWithLiveKit } from './hooks/useWebcamWithLiveKit';

function MyComponent() {
  const { videoRef, state, startCamera, stopCamera } = useWebcamWithLiveKit({
    enableLiveKit: true,
    roomName: 'my-session',
    participantName: 'User',
    onStreamingStateChange: (isStreaming) => {
      console.log('Streaming:', isStreaming);
    },
  });

  // Use videoRef and state as before
}
```

### Advanced: Custom LiveKit Connection

```typescript
import { useLiveKit } from './hooks/useLiveKit';

function MyComponent() {
  const { state, room, publishData, publishTrack } = useLiveKit({
    enabled: true,
    roomName: 'my-room',
    onTrackReceived: (track, participant) => {
      // Handle received video/audio tracks
    },
    onDataReceived: (data, participant) => {
      // Handle received data messages
    },
  });

  // Publish custom data
  const sendData = async () => {
    const data = new TextEncoder().encode(JSON.stringify({ type: 'focus-state', value: 'focused' }));
    await publishData(data, 'focus-updates');
  };
}
```

## Server-Side Processing

To process video frames on the server:

1. **Receive frames via LiveKit**: Set up a LiveKit agent or use the data channel
2. **Process frames**: Use the `/api/livekit/process` endpoint or create custom processing
3. **Send results back**: Use LiveKit's data channel to send results to clients

### Example: Server-Side Agent

You can create a LiveKit agent (separate service) that:
- Joins rooms automatically
- Receives video tracks
- Processes frames with ML models
- Sends analysis results back via data channel

## Configuration

### Room Settings

Rooms are created automatically when the first participant joins. Configure room behavior in the token generation:

```typescript
at.addGrant({
  room: roomName,
  roomJoin: true,
  canPublish: true,
  canSubscribe: true,
  canPublishData: true,
  // Additional permissions
});
```

### Video Quality

Adjust video quality in `useWebcamWithLiveKit`:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },  // Higher resolution
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
});
```

## Security Considerations

1. **Token Generation**: Always generate tokens server-side (never expose API keys)
2. **Room Names**: Use unique, non-guessable room names for sessions
3. **Permissions**: Limit participant permissions based on use case
4. **HTTPS/WSS**: Always use secure connections in production

## Troubleshooting

### Connection Issues

- Verify `NEXT_PUBLIC_LIVEKIT_URL` is correct
- Check that LiveKit server is running
- Ensure API keys are set correctly
- Check browser console for connection errors

### Video Not Streaming

- Verify camera permissions
- Check that `enableLiveKit` is true
- Ensure room connection is established before publishing
- Check network connectivity

### Token Generation Fails

- Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set
- Check server logs for errors
- Ensure environment variables are loaded

## Performance Tips

1. **Adaptive Streaming**: LiveKit automatically adjusts quality based on network
2. **Frame Rate**: Lower frame rates reduce bandwidth (default: 10 FPS for processing)
3. **Resolution**: Balance quality vs. bandwidth (640x480 is a good default)
4. **Data Channel**: Use data channel for lightweight updates instead of video

## Next Steps

- Integrate with existing focus detection hooks
- Add server-side ML model processing
- Implement multi-participant support
- Add recording capabilities
- Set up monitoring and analytics

