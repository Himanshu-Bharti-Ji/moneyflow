import mongoose, { Document, Schema } from 'mongoose';

export interface IBudget extends Document {
  userId:       mongoose.Types.ObjectId;
  month:        number;
  year:         number;
  overallLimit: number;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface ICategoryBudget extends Document {
  budgetId:   mongoose.Types.ObjectId;
  userId:     mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  limit:      number;
}

const budgetSchema = new Schema<IBudget>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month:        { type: Number, required: true, min: 1, max: 12 },
    year:         { type: Number, required: true },
    overallLimit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);
budgetSchema.index({ userId: 1, month: 1, year: 1 }, { unique: true });

const categoryBudgetSchema = new Schema<ICategoryBudget>({
  budgetId:   { type: Schema.Types.ObjectId, ref: 'Budget',   required: true },
  userId:     { type: Schema.Types.ObjectId, ref: 'User',     required: true, index: true },
  categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  limit:      { type: Number, required: true, min: 0 },
});
categoryBudgetSchema.index({ budgetId: 1, categoryId: 1 }, { unique: true });

export const Budget         = mongoose.model<IBudget>('Budget', budgetSchema);
export const CategoryBudget = mongoose.model<ICategoryBudget>('CategoryBudget', categoryBudgetSchema);
