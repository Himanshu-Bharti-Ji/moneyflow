import mongoose, { Document, Schema } from 'mongoose';

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'wallet';

export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:           { type: String, required: true, trim: true, maxlength: 100 },
    type:           { type: String, enum: ['cash', 'bank', 'credit_card', 'wallet'], required: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    color:          { type: String, default: '#10b981' },
    icon:           { type: String, default: 'wallet' },
  },
  { timestamps: true }
);

export const Account = mongoose.model<IAccount>('Account', accountSchema);
