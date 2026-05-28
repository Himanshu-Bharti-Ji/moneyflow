import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBudget }     from '../features/budgets/useBudget';
import { useCategories } from '../features/categories/useCategories';
import Modal             from '../components/ui/Modal';
import { useConfirm }    from '../components/ui/ConfirmProvider';
import { toast }         from '../components/ui/Toast';
import Icon              from '../components/ui/Icon';
import { CheckCircle2, AlertTriangle, XCircle, Siren, Lock } from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import type { BudgetStatus, CategoryBudgetItem } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Status config ── */
const STATUS: Record<BudgetStatus, { bar: string; text: string; badge: string; label: string; icon: React.ReactNode }> = {
  ok:       { bar: 'bg-brand',     text: 'text-brand',     badge: 'bg-emerald-50 text-brand',     label: 'On Track', icon: <CheckCircle2 size={12} strokeWidth={2} />  },
  warning:  { bar: 'bg-amber-400', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-600',   label: 'Warning',  icon: <AlertTriangle size={12} strokeWidth={2} /> },
  exceeded: { bar: 'bg-orange-500',text: 'text-orange-500',badge: 'bg-orange-50 text-orange-500', label: 'Exceeded', icon: <XCircle       size={12} strokeWidth={2} /> },
  critical: { bar: 'bg-red-500',   text: 'text-red-500',   badge: 'bg-red-50 text-red-500',       label: 'Critical', icon: <Siren         size={12} strokeWidth={2} /> },
};

/* ── Progress bar ── */
function ProgressBar({ pct, status }: { pct: number; status: BudgetStatus }) {
  const cfg = STATUS[status];
  return (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

/* ── Zod form schema ── */
const schema = z.object({
  overallLimit: z.coerce.number().min(1, 'Set an overall limit'),
});
type FormData = z.infer<typeof schema>;

/* ── Main page ── */
export default function BudgetsPage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [showEdit, setShowEdit] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const confirm = useConfirm();

  const { data, loading, save } = useBudget(month, year);
  const { expense: expCats }    = useCategories();

  /* ── Navigation guards ── */
  const curYear  = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  // Past month = before current month/year
  const isPastMonth = year < curYear || (year === curYear && month < curMonth);

  // Limit future navigation to 12 months ahead
  const maxYear  = curMonth > 0 ? (curMonth <= 12 ? curYear + (curMonth >= 1 ? 1 : 0) : curYear + 1) : curYear;
  const maxMonth = curMonth === 12 ? 12 : curMonth - 1 === 0 ? 12 : curMonth - 1;
  // Simpler: 12 months ahead of today
  const futureLimit = new Date(now.getFullYear(), now.getMonth() + 12, 1);
  const isAtMaxFuture =
    year > futureLimit.getFullYear() ||
    (year === futureLimit.getFullYear() && month > futureLimit.getMonth() + 1);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isAtMaxFuture) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const handleOpenEdit = () => { setFormDirty(false); setShowEdit(true); };
  const handleCloseEdit = () => { setShowEdit(false); setFormDirty(false); };

  const beforeClose = async () => {
    if (!formDirty) return true;
    return confirm({
      title: 'Discard changes?',
      message: 'You have unsaved budget changes.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
    });
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Budgets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your spending limits</p>
        </div>
        {/* Only show edit/set button for current or future months */}
        {!isPastMonth && (
          <button onClick={handleOpenEdit} className="btn-primary gap-1.5 flex-shrink-0">
            <Icon name="edit" size={15} />
            {data?.hasBudget ? 'Edit' : 'Set Budget'}
          </button>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-3">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">‹</button>
        <div className="text-center min-w-[140px]">
          <span className="text-base font-bold text-slate-700">
            {MONTHS[month - 1]} {year}
          </span>
          {isPastMonth && (
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
              <Lock size={10} /> Past month — read only
            </p>
          )}
        </div>
        <button onClick={nextMonth} disabled={isAtMaxFuture}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30">›</button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="card animate-pulse h-32 bg-slate-100" />
          <div className="card animate-pulse h-24 bg-slate-100" />
          <div className="card animate-pulse h-24 bg-slate-100" />
        </div>
      )}

      {/* No budget set */}
      {!loading && !data?.hasBudget && (
        <div className="card text-center py-14 space-y-4">
          <p className="text-5xl">🎯</p>
          <p className="font-bold text-slate-700 text-lg">
            {isPastMonth ? 'No budget was set' : 'No budget set'}
          </p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            {isPastMonth
              ? 'No budget was configured for this month.'
              : "Set a monthly budget to track your spending and get alerts when you're close to the limit."}
          </p>
          {!isPastMonth && (
            <button onClick={handleOpenEdit} className="btn-primary mx-auto">
              Set Budget for {MONTHS[month - 1]}
            </button>
          )}
        </div>
      )}

      {/* Budget data */}
      {!loading && data?.hasBudget && (
        <>
          {/* Past month read-only banner */}
          {isPastMonth && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <Lock size={14} className="text-slate-400 flex-shrink-0" />
              <p className="text-xs text-slate-500">
                Past months are <span className="font-semibold">read-only</span>. You can view but not edit this budget.
              </p>
            </div>
          )}

          {/* Overall budget card */}
          <OverallCard data={data} />

          {/* Category budgets */}
          {data.categoryBudgets.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-slate-700 px-1">Category Budgets</p>
              {data.categoryBudgets.map((cb) => (
                <CategoryBudgetCard key={cb._id} item={cb} />
              ))}
            </div>
          )}

          {/* Alert summary */}
          <AlertSummary items={data.categoryBudgets} />
        </>
      )}

      {/* Edit modal — only shown for non-past months */}
      {!isPastMonth && (
        <Modal
          open={showEdit}
          onClose={handleCloseEdit}
          title={`Budget — ${MONTHS[month-1]} ${year}`}
          onBeforeClose={beforeClose}
        >
          <BudgetForm
            month={month}
            year={year}
            data={data}
            expCats={expCats}
            onDirtyChange={setFormDirty}
            onSave={async (input) => {
              try {
                await save(input);
                setShowEdit(false);
                setFormDirty(false);
                toast('Budget saved');
              } catch {
                toast('Failed to save budget', 'error');
              }
            }}
            onCancel={handleCloseEdit}
          />
        </Modal>
      )}
    </div>
  );
}

/* ── Overall card ── */
function OverallCard({ data }: { data: any }) {
  const cfg       = STATUS[data.overallStatus as BudgetStatus];
  const remaining = data.overallLimit - data.totalSpent;
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-800">Overall Budget</p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${cfg.badge}`}>
          {cfg.icon}{cfg.label}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Spent</span>
          <span className={`font-bold ${cfg.text}`}>{formatCurrency(data.totalSpent)}</span>
        </div>
        <ProgressBar pct={data.overallPercentage} status={data.overallStatus} />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{data.overallPercentage}% used</span>
          <span>Limit: {formatCurrency(data.overallLimit)}</span>
        </div>
      </div>

      <div className={`rounded-2xl p-3 flex items-center justify-between ${remaining >= 0 ? 'bg-slate-50' : 'bg-red-50'}`}>
        <span className="text-sm text-slate-500">{remaining >= 0 ? 'Remaining' : 'Over budget by'}</span>
        <span className={`font-bold text-base ${remaining >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
          {formatCurrency(Math.abs(remaining))}
        </span>
      </div>
    </div>
  );
}

/* ── Category budget card ── */
function CategoryBudgetCard({ item }: { item: CategoryBudgetItem }) {
  const cfg       = STATUS[item.status];
  const remaining = item.limit - item.spent;
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
             style={{ backgroundColor: item.color + '18' }}>
          {item.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-700 text-sm truncate">{item.name}</p>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1 ${cfg.badge}`}>
              {cfg.icon}{cfg.label}
            </span>
          </div>
          <ProgressBar pct={item.percentage} status={item.status} />
        </div>
      </div>
      <div className="flex justify-between text-xs text-slate-400 -mt-1">
        <span className={`font-semibold ${cfg.text}`}>{formatCurrency(item.spent)} spent</span>
        <span>{item.percentage}% · {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}</span>
      </div>
    </div>
  );
}

/* ── Alert summary ── */
function AlertSummary({ items }: { items: CategoryBudgetItem[] }) {
  const alerts = items.filter((i) => i.status !== 'ok');
  if (!alerts.length) return null;
  return (
    <div className="card space-y-2">
      <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
        <Icon name="alert" size={16} className="text-amber-500" /> Alerts
      </p>
      {alerts.map((a) => {
        const cfg = STATUS[a.status];
        return (
          <div key={a._id} className={`rounded-xl p-3 flex items-center gap-3 ${cfg.badge}`}>
            <span className="text-lg">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${cfg.text}`}>{a.name}</p>
              <p className={`text-xs ${cfg.text} opacity-70`}>
                {a.percentage}% of budget used · {formatCurrency(a.spent)} / {formatCurrency(a.limit)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Budget form ── */
function BudgetForm({ month, year, data, expCats, onSave, onCancel, onDirtyChange }: {
  month: number; year: number; data: any; expCats: any[];
  onSave: (d: any) => Promise<void>; onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { overallLimit: data?.overallLimit || 0 },
  });

  const [catLimits, setCatLimits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data?.categoryBudgets?.forEach((cb: any) => { map[cb.categoryId] = String(cb.limit); });
    return map;
  });

  // Snapshot of catLimits at mount — used to detect real changes vs pre-populated values
  const [initialCatLimits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data?.categoryBudgets?.forEach((cb: any) => { map[cb.categoryId] = String(cb.limit); });
    return map;
  });

  const overallLimit = Number(watch('overallLimit') || 0);
  const catTotal     = Object.values(catLimits).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const catOverflow  = catTotal > overallLimit && overallLimit > 0;

  // Notify parent when dirty state changes.
  // catDirty compares against the initial snapshot to avoid false positives
  // when the form opens with pre-populated category limits.
  useEffect(() => {
    const allKeys = Object.keys({ ...catLimits, ...initialCatLimits });
    const catDirty = allKeys.some(
      (k) => (catLimits[k] ?? '') !== (initialCatLimits[k] ?? '')
    );
    onDirtyChange?.(isDirty || catDirty);
  }, [isDirty, catLimits, initialCatLimits, onDirtyChange]);

  const onSubmit = async (formData: FormData) => {
    const categoryBudgets = Object.entries(catLimits)
      .filter(([, v]) => Number(v) > 0)
      .map(([categoryId, limit]) => ({ categoryId, limit: Number(limit) }));
    await onSave({ month, year, overallLimit: formData.overallLimit, categoryBudgets });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Overall limit */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Overall Monthly Limit (₹)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
          <input {...register('overallLimit')} type="number" step="100" className="input pl-8" placeholder="e.g. 50000" />
        </div>
        {errors.overallLimit && <p className="text-xs text-red-500">{errors.overallLimit.message}</p>}
      </div>

      {/* Category limits */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Category Limits <span className="font-normal text-slate-400">(optional)</span></label>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {expCats.map((cat) => (
            <div key={cat._id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-lg w-8 text-center flex-shrink-0">{cat.icon}</span>
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{cat.name}</span>
              <div className="relative flex-shrink-0 w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  step="100"
                  placeholder="0"
                  value={catLimits[cat._id] ?? ''}
                  onChange={(e) => setCatLimits((prev) => ({ ...prev, [cat._id]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Category sum warning */}
        {catOverflow && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Category limits total <span className="font-bold">{formatCurrency(catTotal)}</span> which exceeds your overall limit of <span className="font-bold">{formatCurrency(overallLimit)}</span>. The overall budget will be hit first.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            : 'Save Budget'}
        </button>
      </div>
    </form>
  );
}
