import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'budget_critical'
  | 'transaction'
  | 'system';

export interface INotification extends Document {
  userId:    mongoose.Types.ObjectId;
  type:      NotificationType;
  title:     string;
  message:   string;
  read:      boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:     { type: String, enum: ['budget_warning','budget_exceeded','budget_critical','transaction','system'], required: true },
    title:    { type: String, required: true },
    message:  { type: String, required: true },
    read:     { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
