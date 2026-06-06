import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle } from 'lucide-react';
import type { Account } from '../../types';
import Icon from '../../components/ui/Icon';

const COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316',
];

const ACCOUNT_TYPES = [
  { value: 'cash',        label: 'Cash',        icon: '💵' },
  { value: 'bank',        label: 'Bank Account', icon: '🏦' },
  { value: 'credit_card', label: 'Credit Card',  icon: '💳' },
  { value: 'wallet',      label: 'Wallet',       icon: '👛' },
];

/* Two separate schemas — create needs openingBalance, edit needs currentBalance */
const createSchema = z.object({
  name:           z.string().min(1, 'Name is required').max(100),
  type:           z.enum(['cash', 'bank', 'credit_card', 'wallet']),
  openingBalance: z.coerce.number({ invalid_type_error: 'Enter a number' }),
  color:          z.string(),
  icon:           z.string(),
});

const editSchema = z.object({
  name:           z.string().min(1, 'Name is required').max(100),
  currentBalance: z.coerce.number({ invalid_type_error: 'Enter a number' }),
  color:          z.string(),
  icon:           z.string(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData   = z.infer<typeof editSchema>;
type FormData       = CreateFormData | EditFormData;

interface Props {
  account?:       Account;
  onSubmit:       (data: any) => Promise<void>;
  onCancel:       () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function AccountForm({ account, onSubmit, onCancel, onDirtyChange }: Props) {
  const isEditing = !!account;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<any>({
    resolver: zodResolver(isEditing ? editSchema : createSchema),
    defaultValues: isEditing
      ? {
          name:           account.name,
          currentBalance: account.currentBalance,
          color:          account.color,
          icon:           account.icon,
        }
      : {
          name:           '',
          type:           'cash',
          openingBalance: 0,
          color:          '#10b981',
          icon:           'wallet',
        },
  });

  useEffect(() => {
    if (account) {
      reset({
        name:           account.name,
        currentBalance: account.currentBalance,
        color:          account.color,
        icon:           account.icon,
      });
    }
  }, [account, reset]);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const selectedColor = watch('color');
  const selectedType  = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Account Name</label>
        <input {...register('name')} className="input" placeholder="e.g. Main Bank Account" />
        {errors.name && <p className="text-xs text-red-500">{String(errors.name.message)}</p>}
      </div>

      {/* Account Type — only shown on create */}
      {!isEditing && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Account Type</label>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue('type', t.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedType === t.value
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opening Balance — create mode only */}
      {!isEditing && (
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Opening Balance</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
            <input
              {...register('openingBalance')}
              type="number"
              step="0.01"
              className="input pl-8"
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          {errors.openingBalance && <p className="text-xs text-red-500">{String(errors.openingBalance.message)}</p>}
        </div>
      )}

      {/* Current Balance — edit mode only */}
      {isEditing && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Current Balance</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
            <input
              {...register('currentBalance')}
              type="number"
              step="0.01"
              className="input pl-8"
              placeholder="0.00"
              inputMode="decimal"
            />
          </div>
          {errors.currentBalance && <p className="text-xs text-red-500">{String(errors.currentBalance.message)}</p>}
          {/* Warn that this is a direct override, not a transaction */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This directly sets your balance. No transaction record will be created.
              Use it to correct an opening balance mistake or sync with your real account.
            </p>
          </div>
          {/* Show opening balance as read-only info */}
          <p className="text-xs text-slate-400">
            Opening balance: ₹{account?.openingBalance?.toLocaleString('en-IN') ?? '0'}
          </p>
        </div>
      )}

      {/* Color */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
              style={{ backgroundColor: c }}
            >
              {selectedColor === c && (
                <Icon name="check" size={14} className="text-white" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : isEditing ? 'Save Changes' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
