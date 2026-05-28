import mongoose, { Document, Schema } from 'mongoose';

export type CategoryType = 'income' | 'expense';

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:      { type: String, required: true, trim: true, maxlength: 100 },
    type:      { type: String, enum: ['income', 'expense'], required: true },
    color:     { type: String, default: '#10b981' },
    icon:      { type: String, default: '📦' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

export const Category = mongoose.model<ICategory>('Category', categorySchema);
