import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { frameData, sessionId, timestamp } = body;

    if (!frameData) {
      return NextResponse.json(
        { error: 'Frame data is required' },
        { status: 400 }
      );
    }

    const base64Image = frameData;
    const imageBuffer = Buffer.from(base64Image, 'base64');

    const analysisResult = {
      sessionId: sessionId || 'unknown',
      timestamp: timestamp || Date.now(),
      processed: true,
      frameSize: imageBuffer.length,
      processingTime: Date.now() - (timestamp || Date.now()),
    };

    return NextResponse.json({
      success: true,
      result: analysisResult,
    });
  } catch (error) {
    console.error('Error processing frame:', error);
    return NextResponse.json(
      { error: 'Failed to process frame' },
      { status: 500 }
    );
  }
}

