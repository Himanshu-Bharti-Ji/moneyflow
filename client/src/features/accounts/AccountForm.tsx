import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const schema = z.object({
  name:           z.string().min(1, 'Name is required').max(100),
  type:           z.enum(['cash', 'bank', 'credit_card', 'wallet']),
  openingBalance: z.coerce.number(),
  color:          z.string(),
  icon:           z.string(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  account?:       Account;
  onSubmit:       (data: FormData) => Promise<void>;
  onCancel:       () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export default function AccountForm({ account, onSubmit, onCancel, onDirtyChange }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:           account?.name           ?? '',
      type:           account?.type           ?? 'cash',
      openingBalance: account?.openingBalance ?? 0,
      color:          account?.color          ?? '#10b981',
      icon:           account?.icon           ?? 'wallet',
    },
  });

  useEffect(() => { if (account) reset({ ...account }); }, [account, reset]);

  // Notify parent of dirty state
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const selectedColor = watch('color');
  const selectedType  = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Account Name</label>
        <input {...register('name')} className="input" placeholder="e.g. Main Bank Account" />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Account Type</label>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setValue('type', t.value as any)}
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

      {/* Opening Balance */}
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
            disabled={!!account}
          />
        </div>
        {account && (
          <p className="text-xs text-slate-400">Opening balance cannot be changed after creation</p>
        )}
        {errors.openingBalance && <p className="text-xs text-red-500">{errors.openingBalance.message}</p>}
      </div>

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
          ) : account ? 'Save Changes' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
