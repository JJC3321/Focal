import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import Session from '@/app/models/Session';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Create a new session
export async function POST(request: NextRequest) {
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

    const { startTime, totalFocusedTime, totalDistractedTime, distractionCount, maxEscalationLevel } = await request.json();

    await connectDB();

    const session = await Session.create({
      userId: decoded.userId,
      startTime: new Date(startTime),
      totalFocusedTime: totalFocusedTime || 0,
      totalDistractedTime: totalDistractedTime || 0,
      distractionCount: distractionCount || 0,
      maxEscalationLevel: maxEscalationLevel || 0,
    });

    return NextResponse.json(
      {
        success: true,
        session: {
          id: session._id,
          startTime: session.startTime,
          totalFocusedTime: session.totalFocusedTime,
          totalDistractedTime: session.totalDistractedTime,
          distractionCount: session.distractionCount,
          maxEscalationLevel: session.maxEscalationLevel,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Error creating session', details: error.message },
      { status: 500 }
    );
  }
}

// Get all sessions for the authenticated user
export async function GET(request: NextRequest) {
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

    await connectDB();

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const sessions = await Session.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Session.countDocuments({ userId: decoded.userId });

    return NextResponse.json(
      {
        success: true,
        sessions,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + sessions.length < total,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { error: 'Error fetching sessions', details: error.message },
      { status: 500 }
    );
  }
}
