import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';
import { transactionsApi } from '../features/transactions/transactions.api';
import { useAccounts }     from '../features/accounts/useAccounts';
import { useCategories }   from '../features/categories/useCategories';
import { useConfirm }      from '../components/ui/ConfirmProvider';
import { toast }           from '../components/ui/Toast';
import Icon                from '../components/ui/Icon';
import { formatCurrency }  from '../lib/currency';
import type { TransactionType } from '../types';

/**
 * Build a UTC ISO string that stores the user-selected date with the CURRENT
 * clock time in IST (Asia/Kolkata, UTC+5:30).
 *
 * The backend date filter uses UTC midnight–23:59:59 boundaries, so IST times
 * before 05:30 would shift the UTC date to the previous day and break filters.
 * In that edge case we clamp to T00:00:00.000Z (= 05:30 AM IST exactly).
 */
function buildIstDatetime(dateStr: string): string {
  const now  = new Date();
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === 'hour')?.value   ?? '12';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const s = parts.find((p) => p.type === 'second')?.value ?? '00';

  // Parse as IST datetime (+05:30)
  const istDt = new Date(`${dateStr}T${h}:${m}:${s}+05:30`);

  // If UTC date slipped to previous day (IST time < 05:30), clamp to UTC midnight
  const utcDate = istDt.toISOString().split('T')[0];
  return utcDate === dateStr ? istDt.toISOString() : `${dateStr}T00:00:00.000Z`;
}

const schema = z.object({
  type:               z.enum(['income','expense','transfer']),
  amount:             z.coerce.number({ invalid_type_error: 'Enter an amount' }).positive('Must be greater than 0'),
  accountId:          z.string().min(1, 'Select an account'),
  categoryId:         z.string().optional().nullable(),
  transferAccountId:  z.string().optional().nullable(),
  date:               z.string().min(1, 'Select a date'),
  notes:              z.string().max(500).default(''),
}).refine((d) => d.type !== 'transfer' || !!d.transferAccountId, {
  message: 'Select destination account', path: ['transferAccountId'],
}).refine((d) => {
  if (d.type === 'transfer' && d.transferAccountId) {
    return d.accountId !== d.transferAccountId;
  }
  return true;
}, { message: 'Source and destination accounts must be different', path: ['transferAccountId'] });

type FormData = z.infer<typeof schema>;

const TYPE_CONFIG = {
  expense:  { label: 'Expense',  color: 'bg-red-500',  light: 'bg-red-50',    text: 'text-red-500',  icon: '💸' },
  income:   { label: 'Income',   color: 'bg-brand',    light: 'bg-emerald-50', text: 'text-brand',   icon: '💰' },
  transfer: { label: 'Transfer', color: 'bg-blue-500', light: 'bg-blue-50',   text: 'text-blue-500', icon: '🔄' },
};

export default function AddTransactionPage() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const confirm      = useConfirm();
  const initialType  = (params.get('type') as TransactionType) || 'expense';

  const { accounts }                          = useAccounts();
  const { expense: expCats, income: incCats } = useCategories();

  const { register, handleSubmit, watch, setValue, control,
          formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:   initialType,
      amount: undefined as any,
      date:   format(new Date(), 'yyyy-MM-dd'),
      notes:  '',
    },
  });

  useEffect(() => {
    setValue('type', initialType);
    setValue('categoryId', null);
  }, [initialType, setValue]);

  const type      = watch('type');
  const amount    = watch('amount');
  const accountId = watch('accountId');
  const cfg       = TYPE_CONFIG[type];
  const cats      = type === 'expense' ? expCats : incCats;

  // Selected account object (for balance check)
  const selectedAccount = accounts.find((a) => a._id === accountId);

  // Overdraft: warn if expense amount > account balance
  const showOverdraftWarning =
    type === 'expense' &&
    !!selectedAccount &&
    !!amount &&
    Number(amount) > selectedAccount.currentBalance;

  // For transfer: exclude the already-selected "from" account in the "to" dropdown
  const toAccountOptions = accounts.filter((a) => a._id !== accountId);

  useEffect(() => { setValue('categoryId', null); }, [type, setValue]);

  /* Back navigation — warn if form has been touched */
  const handleBack = async () => {
    if (isDirty) {
      const ok = await confirm({
        title:        'Discard changes?',
        message:      'You have unsaved transaction data.',
        confirmLabel: 'Discard',
        cancelLabel:  'Keep editing',
      });
      if (!ok) return;
    }
    navigate(-1);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await transactionsApi.create({
        ...data,
        // Store user-selected date + current IST clock time as UTC.
        // Falls back to T00:00:00.000Z (= 05:30 IST) only when IST time < 05:30
        // to prevent the UTC date from slipping to the previous day.
        date: buildIstDatetime(data.date),
        categoryId:        data.categoryId        || null,
        transferAccountId: data.transferAccountId || null,
      });
      toast('Transaction added');
      navigate('/transactions');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to save', 'error');
    }
  };

  return (
    <div className="page max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
        >
          <Icon name="chevron-right" size={18} className="rotate-180" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">Add Transaction</h1>
      </div>

      {/* Type tabs */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        {(['expense','income','transfer'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setValue('type', t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              type === t ? `${TYPE_CONFIG[t].color} text-white shadow-sm` : 'text-slate-400'
            }`}
          >
            {TYPE_CONFIG[t].icon} {TYPE_CONFIG[t].label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount */}
        <div className={`${cfg.light} rounded-3xl p-5 space-y-1`}>
          <label className={`text-sm font-semibold ${cfg.text}`}>Amount (₹)</label>
          <div className="flex items-center gap-2">
            <span className={`text-3xl font-bold ${cfg.text}`}>₹</span>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className={`bg-transparent text-3xl font-bold w-full outline-none ${cfg.text} placeholder:text-slate-300`}
              inputMode="decimal"
            />
          </div>
          {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
        </div>

        {/* Account */}
        <div className="card space-y-2 p-4">
          <label className="text-sm font-semibold text-slate-700">
            {type === 'transfer' ? 'From Account' : 'Account'}
          </label>
          <select {...register('accountId')} className="input">
            <option value="">Select account…</option>
            {accounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name} — {formatCurrency(a.currentBalance)}
              </option>
            ))}
          </select>
          {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}

          {/* Overdraft warning */}
          {showOverdraftWarning && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This expense (<span className="font-bold">{formatCurrency(Number(amount))}</span>) exceeds{' '}
                <span className="font-bold">{selectedAccount!.name}</span>'s balance of{' '}
                <span className="font-bold">{formatCurrency(selectedAccount!.currentBalance)}</span>.
                Your balance will go negative.
              </p>
            </div>
          )}
        </div>

        {/* Transfer — destination account (same account excluded) */}
        {type === 'transfer' && (
          <div className="card space-y-2 p-4">
            <label className="text-sm font-semibold text-slate-700">To Account</label>
            <select {...register('transferAccountId')} className="input">
              <option value="">Select destination…</option>
              {toAccountOptions.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} — {formatCurrency(a.currentBalance)}
                </option>
              ))}
            </select>
            {toAccountOptions.length === 0 && accountId && (
              <p className="text-xs text-slate-400">
                You need at least 2 accounts to make a transfer.
              </p>
            )}
            {errors.transferAccountId && (
              <p className="text-xs text-red-500">{errors.transferAccountId.message}</p>
            )}
          </div>
        )}

        {/* Category (not for transfer) */}
        {type !== 'transfer' && (
          <div className="card p-4 space-y-2">
            <label className="text-sm font-semibold text-slate-700">Category</label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {cats.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      onClick={() => field.onChange(field.value === cat._id ? null : cat._id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${
                        field.value === cat._id
                          ? 'border-transparent shadow-sm'
                          : 'border-slate-100 hover:border-slate-200'
                      }`}
                      style={field.value === cat._id ? { backgroundColor: cat.color + '18', borderColor: cat.color } : {}}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[10px] font-medium text-slate-600 leading-tight line-clamp-2">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
        )}

        {/* Date + Notes */}
        <div className="card p-4 space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Date</label>
            <input
              {...register('date')}
              type="date"
              max={format(new Date(), 'yyyy-MM-dd')}
              className="input"
            />
            {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-semibold text-slate-700">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="What was this for?"
              className="input resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 ${cfg.color} shadow-lg disabled:opacity-60`}
        >
          {isSubmitting
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            : `Add ${cfg.label}`}
        </button>
      </form>
    </div>
  );
}
