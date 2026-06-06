import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { transactionsApi } from '../features/transactions/transactions.api';
import { budgetsApi }      from '../features/budgets/budgets.api';
import { useAccounts }     from '../features/accounts/useAccounts';
import { useCategories }   from '../features/categories/useCategories';
import { useConfirm }      from '../components/ui/ConfirmProvider';
import { toast }           from '../components/ui/Toast';
import Icon                from '../components/ui/Icon';
import { formatCurrency }  from '../lib/currency';
import type { BudgetData, CustomBudgetData, TransactionType } from '../types';

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

/* ─────────────────────────────────────────────────────────
   Budget Impact — single unified card, shown only when
   the user has typed an amount (amount > 0)
   ───────────────────────────────────────────────────────── */

type BudgetStatus = 'ok' | 'warning' | 'exceeded' | 'critical';

const S: Record<BudgetStatus, { bar: string; pill: string; text: string }> = {
  ok:       { bar: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700' },
  warning:  { bar: 'bg-amber-400',   pill: 'bg-amber-100 text-amber-700',     text: 'text-amber-700'   },
  exceeded: { bar: 'bg-orange-500',  pill: 'bg-orange-100 text-orange-600',   text: 'text-orange-600'  },
  critical: { bar: 'bg-red-500',     pill: 'bg-red-100 text-red-600',         text: 'text-red-600'     },
};
const LABEL: Record<BudgetStatus, string> = {
  ok: 'On track', warning: 'Warning', exceeded: 'Exceeded', critical: 'Critical',
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function statusOf(pct: number): BudgetStatus {
  if (pct >= 120) return 'critical';
  if (pct >= 100) return 'exceeded';
  if (pct >= 80)  return 'warning';
  return 'ok';
}

function ImpactBar({ curPct, projPct, projStatus }: {
  curPct: number; projPct: number; projStatus: BudgetStatus;
}) {
  const cur  = Math.min(curPct,  100);
  const proj = Math.min(projPct, 100);
  return (
    <div className="relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      {/* ghost: how far the projected bar extends beyond current */}
      {proj > cur && (
        <div className={`absolute inset-y-0 left-0 rounded-full opacity-25 transition-all duration-300 ${S[projStatus].bar}`}
          style={{ width: `${proj}%` }} />
      )}
      {/* solid current */}
      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${S[projStatus].bar}`}
        style={{ width: `${cur}%` }} />
    </div>
  );
}

interface BudgetRow {
  id:         string;
  label:      string;
  spent:      number;
  limit:      number;
  curPct:     number;
  curStatus:  BudgetStatus;
  projSpent:  number;
  projPct:    number;
  projStatus: BudgetStatus;
  remaining:  number;
}

function BudgetImpact({ date, amount }: { date: string; amount: number }) {
  const [monthly, setMonthly] = useState<BudgetData | null>(null);
  const [customs, setCustoms] = useState<CustomBudgetData[]>([]);

  // Pre-fetch as soon as the component mounts / date changes.
  // The UI stays hidden until amount > 0, but data is already ready.
  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    const [y, m] = date.split('-').map(Number);
    Promise.all([
      budgetsApi.get(m, y).catch(() => null),
      budgetsApi.listCustom().catch(() => [] as CustomBudgetData[]),
    ]).then(([monthlyData, allCustom]) => {
      if (cancelled) return;
      setMonthly(monthlyData);
      const txDate = new Date(date);
      setCustoms(
        (allCustom as CustomBudgetData[]).filter((b) => {
          const start = new Date(b.startDate);
          const end   = new Date(b.endDate + 'T23:59:59');
          return txDate >= start && txDate <= end;
        })
      );
    });
    return () => { cancelled = true; };
  }, [date]);

  // Only render when user has typed an amount
  if (amount <= 0) return null;

  // Build rows
  const rows: BudgetRow[] = [];

  if (monthly?.hasBudget) {
    const spent      = monthly.totalSpent;
    const limit      = monthly.overallLimit;
    const projSpent  = spent + amount;
    const projPct    = limit > 0 ? Math.round((projSpent / limit) * 100) : 0;
    const [y, m]     = date.split('-').map(Number);
    rows.push({
      id:         'monthly',
      label:      `Monthly · ${MONTHS[m - 1]} ${y}`,
      spent, limit,
      curPct:     monthly.overallPercentage,
      curStatus:  monthly.overallStatus as BudgetStatus,
      projSpent,  projPct,
      projStatus: statusOf(projPct),
      remaining:  limit - projSpent,
    });
  }

  customs.forEach((cb) => {
    const spent     = cb.totalSpent;
    const limit     = cb.overallLimit;
    const projSpent = spent + amount;
    const projPct   = limit > 0 ? Math.round((projSpent / limit) * 100) : 0;
    rows.push({
      id:         cb._id,
      label:      cb.name || `${cb.startDate} – ${cb.endDate}`,
      spent, limit,
      curPct:     cb.overallPercentage,
      curStatus:  cb.overallStatus as BudgetStatus,
      projSpent,  projPct,
      projStatus: statusOf(projPct),
      remaining:  limit - projSpent,
    });
  });

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50">
        <TrendingDown size={13} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Budget Impact</span>
      </div>

      {/* One row per budget */}
      {rows.map((row, i) => (
        <div key={row.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
          <div className="px-4 py-3 space-y-2">
            {/* Name + status pill */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 truncate">{row.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${S[row.projStatus].pill}`}>
                {LABEL[row.projStatus]}
              </span>
            </div>

            {/* Progress bar */}
            <ImpactBar curPct={row.curPct} projPct={row.projPct} projStatus={row.projStatus} />

            {/* Numbers: spent → projected · remaining/over */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 text-slate-400">
                <span>{formatCurrency(row.spent)}</span>
                <span>→</span>
                <span className={`font-bold ${S[row.projStatus].text}`}>{formatCurrency(row.projSpent)}</span>
                <span className="text-slate-300">/ {formatCurrency(row.limit)}</span>
              </div>
              <span className={`font-bold ${row.remaining >= 0 ? 'text-slate-500' : 'text-red-500'}`}>
                {row.remaining >= 0
                  ? `${formatCurrency(row.remaining)} left`
                  : `${formatCurrency(Math.abs(row.remaining))} over`}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AddTransactionPage() {
  const navigate     = useNavigate();
  const [params]     = useSearchParams();
  const confirm      = useConfirm();
  const initialType  = (params.get('type') as TransactionType) || 'expense';

  // Ref to the amount input for auto-focus
  const amountRef = useRef<HTMLInputElement | null>(null);

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
  const date      = watch('date');
  const cfg       = TYPE_CONFIG[type];
  const cats      = type === 'expense' ? expCats : incCats;

  // Auto-focus amount input on mount and whenever the type tab changes
  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [type]);

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

      // For expenses: refresh notification badge and show budget status hint
      if (data.type === 'expense') {
        window.dispatchEvent(new CustomEvent('mf:refresh-notifications'));
        // Small delay to let server process budget alerts before we fetch budget
        setTimeout(async () => {
          try {
            const [y, m] = data.date.split('-').map(Number);
            const budget = await budgetsApi.get(m, y);
            if (budget.hasBudget && budget.overallStatus !== 'ok') {
              const msg: Record<string, string> = {
                warning:  `⚠️ Budget warning — ${budget.overallPercentage}% used (₹${budget.totalSpent.toLocaleString('en-IN')} of ₹${budget.overallLimit.toLocaleString('en-IN')})`,
                exceeded: `🚨 Budget exceeded — ${budget.overallPercentage}% used`,
                critical: `🔴 Budget critical — ${budget.overallPercentage}% used`,
              };
              toast(msg[budget.overallStatus] ?? '', 'error');
            }
          } catch { /* non-blocking */ }
        }, 600);
      }

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
              {...(() => {
                const { ref, ...rest } = register('amount');
                return {
                  ...rest,
                  ref: (el: HTMLInputElement | null) => {
                    ref(el);
                    amountRef.current = el;
                  },
                };
              })()}
              type="number"
              step="0.01"
              placeholder="0.00"
              inputMode="numeric"
              className={`bg-transparent text-3xl font-bold w-full outline-none ${cfg.text} placeholder:text-slate-300`}
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

        {/* Budget impact preview — only for expenses */}
        {type === 'expense' && (
          <BudgetImpact date={date} amount={Number(amount) || 0} />
        )}

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
