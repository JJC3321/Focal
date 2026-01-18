import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime?: Date;
  totalFocusedTime: number;
  totalDistractedTime: number;
  distractionCount: number;
  maxEscalationLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    totalFocusedTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDistractedTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    distractionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxEscalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 3,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
SessionSchema.index({ userId: 1, createdAt: -1 });

// Prevent model recompilation in development
const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
