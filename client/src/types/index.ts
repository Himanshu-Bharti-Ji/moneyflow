export interface User {
  _id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}

export type BudgetStatus = 'ok' | 'warning' | 'exceeded' | 'critical';

export interface CategoryBudgetItem {
  _id:        string;
  categoryId: string;
  name:       string;
  color:      string;
  icon:       string;
  limit:      number;
  spent:      number;
  percentage: number;
  status:     BudgetStatus;
}

export interface BudgetData {
  month:             number;
  year:              number;
  overallLimit:      number;
  totalSpent:        number;
  overallPercentage: number;
  overallStatus:     BudgetStatus;
  categoryBudgets:   CategoryBudgetItem[];
  hasBudget:         boolean;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  _id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  accountId: Account | string;
  categoryId?: Category | string | null;
  transferAccountId?: Account | string | null;
  date: string;
  notes: string;
  createdAt: string;
}

export type CategoryType = 'income' | 'expense';

export interface Category {
  _id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
}

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'wallet';

export interface Account {
  _id: string;
  userId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export type NotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'budget_critical'
  | 'transaction'
  | 'system';

export interface AppNotification {
  _id:       string;
  type:      NotificationType;
  title:     string;
  message:   string;
  read:      boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ReportSummary {
  income:      number;
  expense:     number;
  savings:     number;
  savingsRate: number;
}

export interface MonthlyBreakdown {
  name:    string;
  year:    number;
  month:   number;
  income:  number;
  expense: number;
}

export interface CategoryBreakdown {
  _id:        string;
  name:       string;
  icon:       string;
  color:      string;
  total:      number;
  percentage: number;
}

export interface DailyTrend {
  date:    string;
  income:  number;
  expense: number;
}

export interface ReportData {
  summary:            ReportSummary;
  monthlyBreakdown:   MonthlyBreakdown[];
  categoryBreakdown:  CategoryBreakdown[];
  dailyTrend:         DailyTrend[];
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurringTransaction {
  _id:                string;
  type:               'income' | 'expense';
  amount:             number;
  accountId:          Account | string;
  categoryId?:        Category | string | null;
  notes:              string;
  frequency:          RecurringFrequency;
  startDate:          string;
  endDate?:           string | null;
  nextDueDate:        string;
  lastProcessedDate?: string | null;
  isActive:           boolean;
  createdAt:          string;
}

export interface ApiError {
  error: string;
  errors?: { field: string; message: string }[];
}

export interface CustomCategoryBudgetItem {
  _id:        string;
  categoryId: string;
  name:       string;
  color:      string;
  icon:       string;
  limit:      number;
  spent:      number;
  percentage: number;
  status:     BudgetStatus;
}

export interface CustomBudgetData {
  _id:               string;
  name:              string;
  startDate:         string;
  endDate:           string;
  overallLimit:      number;
  totalSpent:        number;
  overallPercentage: number;
  overallStatus:     BudgetStatus;
  categoryBudgets:   CustomCategoryBudgetItem[];
  daysTotal:         number;
  daysLeft:          number;
  isActive:          boolean;
  isPast:            boolean;
  isFuture:          boolean;
}