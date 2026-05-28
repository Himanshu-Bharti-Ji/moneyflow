import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomBudget extends Document {
  userId:       mongoose.Types.ObjectId;
  name:         string;
  startDate:    Date;
  endDate:      Date;
  overallLimit: number;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface ICustomCategoryBudget extends Document {
  customBudgetId: mongoose.Types.ObjectId;
  userId:         mongoose.Types.ObjectId;
  categoryId:     mongoose.Types.ObjectId;
  limit:          number;
}

const customBudgetSchema = new Schema<ICustomBudget>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:         { type: String, default: '', maxlength: 100 },
    startDate:    { type: Date, required: true },
    endDate:      { type: Date, required: true },
    overallLimit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);
customBudgetSchema.index({ userId: 1, startDate: -1 });

const customCategoryBudgetSchema = new Schema<ICustomCategoryBudget>({
  customBudgetId: { type: Schema.Types.ObjectId, ref: 'CustomBudget', required: true },
  userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  categoryId:     { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  limit:          { type: Number, required: true, min: 0 },
});
customCategoryBudgetSchema.index({ customBudgetId: 1, categoryId: 1 }, { unique: true });

export const CustomBudget         = mongoose.model<ICustomBudget>('CustomBudget', customBudgetSchema);
export const CustomCategoryBudget = mongoose.model<ICustomCategoryBudget>('CustomCategoryBudget', customCategoryBudgetSchema);