import { Category } from './category.model.js';
import { Transaction } from '../transactions/transaction.model.js';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../seed/defaultCategories.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schema.js';

export async function seedDefaultCategories(userId: string) {
  const existing = await Category.countDocuments({ userId });
  if (existing > 0) return;

  const expense = DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, userId, type: 'expense' as const, isDefault: true }));
  const income  = DEFAULT_INCOME_CATEGORIES.map((c)  => ({ ...c, userId, type: 'income'  as const, isDefault: true }));

  await Category.insertMany([...expense, ...income]);
}

export async function getCategories(userId: string) {
  return Category.find({ userId }).sort({ type: 1, name: 1 });
}

export async function getCategoryById(id: string, userId: string) {
  const cat = await Category.findOne({ _id: id, userId });
  if (!cat) {
    const err: any = new Error('Category not found');
    err.status = 404;
    throw err;
  }
  return cat;
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  const exists = await Category.findOne({ userId, name: input.name, type: input.type });
  if (exists) {
    const err: any = new Error('A category with this name already exists');
    err.status = 409;
    throw err;
  }
  return Category.create({ userId, ...input });
}

export async function updateCategory(id: string, userId: string, input: UpdateCategoryInput) {
  const cat = await Category.findOneAndUpdate(
    { _id: id, userId },
    { $set: input },
    { new: true }
  );
  if (!cat) {
    const err: any = new Error('Category not found');
    err.status = 404;
    throw err;
  }
  return cat;
}

export async function deleteCategory(id: string, userId: string) {
  const cat = await Category.findOne({ _id: id, userId });
  if (!cat) {
    const err: any = new Error('Category not found');
    err.status = 404;
    throw err;
  }
  if (cat.isDefault) {
    const err: any = new Error('Default categories cannot be deleted');
    err.status = 403;
    throw err;
  }

  const txCount = await Transaction.countDocuments({ userId, categoryId: id });
  if (txCount > 0) {
    const err: any = new Error(
      `Cannot delete: this category is used in ${txCount} transaction${txCount !== 1 ? 's' : ''}. Reassign those transactions first.`
    );
    err.status = 409;
    throw err;
  }

  await cat.deleteOne();
  return cat;
}
