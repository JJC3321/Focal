import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Session from '@/app/models/Session';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Update a session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const { endTime, totalFocusedTime, totalDistractedTime, distractionCount, maxEscalationLevel } = await request.json();
    const { id } = await params;

    await connectDB();

    // Find session and verify it belongs to the user
    const session = await Session.findOne({
      _id: id,
      userId: decoded.userId,
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session
    session.endTime = endTime ? new Date(endTime) : undefined;
    session.totalFocusedTime = totalFocusedTime ?? session.totalFocusedTime;
    session.totalDistractedTime = totalDistractedTime ?? session.totalDistractedTime;
    session.distractionCount = distractionCount ?? session.distractionCount;
    session.maxEscalationLevel = Math.max(
      session.maxEscalationLevel,
      maxEscalationLevel ?? 0
    );

    await session.save();

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session._id,
          startTime: session.startTime,
          endTime: session.endTime,
          totalFocusedTime: session.totalFocusedTime,
          totalDistractedTime: session.totalDistractedTime,
          distractionCount: session.distractionCount,
          maxEscalationLevel: session.maxEscalationLevel,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Session update error:', error);
    return NextResponse.json(
      { error: 'Error updating session', details: error.message },
      { status: 500 }
    );
  }
}
