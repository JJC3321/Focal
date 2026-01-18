import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

export async function PUT(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const { apiKey } = await request.json();

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a valid API key' },
        { status: 400 }
      );
    }

    await connectDB();

    // Update user's API key
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { geminiApiKey: apiKey },
      { new: true }
    ).select('+geminiApiKey');

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'API key updated successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('API key update error:', error);
    return NextResponse.json(
      { error: 'Error updating API key', details: error.message },
      { status: 500 }
    );
  }
}
