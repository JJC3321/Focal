# Focal - AI-Powered Focus Monitoring

Focal is an AI-powered focus monitoring application that uses computer vision to track your attention and provide interventions when you get distracted.

## Features

- **Real-time Focus Detection**: Uses MediaPipe for local face detection and pose estimation
- **AI-Powered Analysis**: Optional integration with Overshoot AI for enhanced vision analysis
- **LiveKit Integration**: Real-time video/data streaming infrastructure for low-latency communication
- **Escalation System**: Progressive interventions when distractions are detected
- **Session Tracking**: Monitor focus statistics and session duration

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Camera access
- (Optional) Gemini API key for personality features
- (Optional) Overshoot API key for AI vision mode
- (Optional) LiveKit server for remote processing

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (see `.env.example`):

```bash
cp .env.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## LiveKit Integration

Focal includes LiveKit integration for real-time video/data streaming, enabling:

- Low-latency communication between client and server
- Remote model execution on server-side
- Scalable infrastructure for multiple concurrent sessions
- Bidirectional data communication

See [LIVEKIT_SETUP.md](./LIVEKIT_SETUP.md) for detailed setup instructions.

### Quick Start with LiveKit

1. Set up a LiveKit server (self-hosted or cloud)
2. Add environment variables:
   ```env
   LIVEKIT_API_KEY=your_api_key
   LIVEKIT_API_SECRET=your_api_secret
   NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
   ```
3. Use `useWebcamWithLiveKit` hook instead of `useWebcam`:
   ```typescript
   import { useWebcamWithLiveKit } from './hooks/useWebcamWithLiveKit';
   
   const { videoRef, state, startCamera } = useWebcamWithLiveKit({
     enableLiveKit: true,
     roomName: 'my-session',
   });
   ```

See `app/examples/LiveKitIntegrationExample.tsx` for complete examples.

## Project Structure

- `app/hooks/` - React hooks for webcam, focus detection, and LiveKit
- `app/components/` - UI components
- `app/api/` - API routes including LiveKit token generation
- `app/lib/` - Utility functions and classifiers
- `app/store/` - Zustand state management

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [LiveKit Documentation](https://docs.livekit.io/)
- [MediaPipe Documentation](https://developers.google.com/mediapipe)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
