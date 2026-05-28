import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface ITransaction extends Document {
  userId:            mongoose.Types.ObjectId;
  type:              TransactionType;
  amount:            number;
  accountId:         mongoose.Types.ObjectId;
  categoryId?:       mongoose.Types.ObjectId;
  transferAccountId?:mongoose.Types.ObjectId;
  date:              Date;
  notes:             string;
  createdAt:         Date;
  updatedAt:         Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
    type:               { type: String, enum: ['income','expense','transfer'], required: true },
    amount:             { type: Number, required: true, min: 0.01 },
    accountId:          { type: Schema.Types.ObjectId, ref: 'Account',  required: true },
    categoryId:         { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    transferAccountId:  { type: Schema.Types.ObjectId, ref: 'Account',  default: null },
    date:               { type: Date, required: true, default: Date.now },
    notes:              { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, accountId: 1, date: -1 });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);
