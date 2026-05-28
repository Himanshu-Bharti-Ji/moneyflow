import mongoose, { Schema, Document } from 'mongoose';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface IRecurringTransaction extends Document {
  userId:             mongoose.Types.ObjectId;
  type:               'income' | 'expense';
  amount:             number;
  accountId:          mongoose.Types.ObjectId;
  categoryId?:        mongoose.Types.ObjectId | null;
  notes:              string;
  frequency:          RecurringFrequency;
  startDate:          Date;
  endDate?:           Date | null;
  nextDueDate:        Date;
  lastProcessedDate?: Date | null;
  isActive:           boolean;
  createdAt:          Date;
  updatedAt:          Date;
}

const schema = new Schema<IRecurringTransaction>(
  {
    userId:            { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    type:              { type: String, enum: ['income','expense'],      required: true },
    amount:            { type: Number, required: true, min: 0.01 },
    accountId:         { type: Schema.Types.ObjectId, ref: 'Account',  required: true },
    categoryId:        { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    notes:             { type: String, default: '' },
    frequency:         { type: String, enum: ['daily','weekly','monthly','yearly'], required: true },
    startDate:         { type: Date, required: true },
    endDate:           { type: Date, default: null },
    nextDueDate:       { type: Date, required: true, index: true },
    lastProcessedDate: { type: Date, default: null },
    isActive:          { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const RecurringTransaction = mongoose.model<IRecurringTransaction>(
  'RecurringTransaction', schema
);
