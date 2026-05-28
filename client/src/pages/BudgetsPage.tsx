import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBudget }     from '../features/budgets/useBudget';
import { useCategories } from '../features/categories/useCategories';
import { budgetsApi }    from '../features/budgets/budgets.api';
import Modal             from '../components/ui/Modal';
import { useConfirm }    from '../components/ui/ConfirmProvider';
import { toast }         from '../components/ui/Toast';
import Icon              from '../components/ui/Icon';
import {
  CheckCircle2, AlertTriangle, XCircle, Siren, Lock,
  CalendarRange, Calendar,
} from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import type { BudgetStatus, CategoryBudgetItem, CustomBudgetData } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Status config ── */
const STATUS: Record<BudgetStatus, { bar: string; text: string; badge: string; label: string; icon: React.ReactNode }> = {
  ok:       { bar: 'bg-brand',      text: 'text-brand',     badge: 'bg-emerald-50 text-brand',     label: 'On Track', icon: <CheckCircle2  size={12} strokeWidth={2} /> },
  warning:  { bar: 'bg-amber-400',  text: 'text-amber-600', badge: 'bg-amber-50 text-amber-600',   label: 'Warning',  icon: <AlertTriangle size={12} strokeWidth={2} /> },
  exceeded: { bar: 'bg-orange-500', text: 'text-orange-500',badge: 'bg-orange-50 text-orange-500', label: 'Exceeded', icon: <XCircle       size={12} strokeWidth={2} /> },
  critical: { bar: 'bg-red-500',    text: 'text-red-500',   badge: 'bg-red-50 text-red-500',       label: 'Critical', icon: <Siren         size={12} strokeWidth={2} /> },
};

function ProgressBar({ pct, status }: { pct: number; status: BudgetStatus }) {
  return (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${STATUS[status].bar}`}
        style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

/* ── Monthly zod schema ── */
const monthlySchema = z.object({
  overallLimit: z.coerce.number().min(1, 'Set an overall limit'),
});
type MonthlyFormData = z.infer<typeof monthlySchema>;

/* ── Custom budget zod schema ── */
const customSchema = z.object({
  name:         z.string().max(100).optional(),
  startDate:    z.string().min(1, 'Start date required'),
  endDate:      z.string().min(1, 'End date required'),
  overallLimit: z.coerce.number().min(1, 'Set an overall limit'),
}).refine(
  (d) => !d.endDate || !d.startDate || new Date(d.endDate) >= new Date(d.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);
type CustomFormData = z.infer<typeof customSchema>;

function todayStr() { return new Date().toISOString().split('T')[0]; }

/* ════════════════════════════════════════════════════════════
   Main page
   ════════════════════════════════════════════════════════════ */
export default function BudgetsPage() {
  const now   = new Date();
  const [tab,    setTab]    = useState<'monthly' | 'custom'>('monthly');

  /* ── Monthly state ── */
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [showEdit,  setShowEdit]  = useState(false);
  const [monthlyDirty, setMonthlyDirty] = useState(false);

  /* ── Custom state ── */
  const [customBudgets,  setCustomBudgets]  = useState<CustomBudgetData[]>([]);
  const [customLoading,  setCustomLoading]  = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDirty,    setCustomDirty]    = useState(false);

  const confirm = useConfirm();
  const { data, loading, save } = useBudget(month, year);
  const { expense: expCats }    = useCategories();

  const curYear  = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const isPastMonth  = year < curYear || (year === curYear && month < curMonth);
  const futureLimit  = new Date(now.getFullYear(), now.getMonth() + 12, 1);
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

  /* ── Load custom budgets when tab switches ── */
  const loadCustom = async () => {
    setCustomLoading(true);
    try { setCustomBudgets(await budgetsApi.listCustom()); }
    catch { toast('Failed to load custom budgets', 'error'); }
    finally { setCustomLoading(false); }
  };

  useEffect(() => {
    if (tab === 'custom') loadCustom();
  }, [tab]);

  /* ── Monthly dirty guard ── */
  const handleOpenEdit = () => { setMonthlyDirty(false); setShowEdit(true); };
  const handleCloseEdit = () => { setShowEdit(false); setMonthlyDirty(false); };
  const monthlyBeforeClose = async () => {
    if (!monthlyDirty) return true;
    return confirm({ title: 'Discard changes?', message: 'You have unsaved budget changes.', confirmLabel: 'Discard', cancelLabel: 'Keep editing' });
  };

  /* ── Custom dirty guard ── */
  const customBeforeClose = async () => {
    if (!customDirty) return true;
    return confirm({ title: 'Discard changes?', message: 'You have unsaved budget changes.', confirmLabel: 'Discard', cancelLabel: 'Keep editing' });
  };

  /* ── Delete custom budget ── */
  const handleDeleteCustom = async (id: string, label: string) => {
    const ok = await confirm({
      title: 'Delete Budget', message: `Delete "${label}"?`,
      detail: 'This cannot be undone.', confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;
    try {
      await budgetsApi.deleteCustom(id);
      setCustomBudgets((prev) => prev.filter((b) => b._id !== id));
      toast('Deleted');
    } catch { toast('Failed to delete', 'error'); }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Budgets</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your spending limits</p>
        </div>
        {tab === 'monthly' && !isPastMonth && (
          <button onClick={handleOpenEdit} className="btn-primary gap-1.5 flex-shrink-0">
            <Icon name="edit" size={15} />
            {data?.hasBudget ? 'Edit' : 'Set Budget'}
          </button>
        )}
        {tab === 'custom' && (
          <button onClick={() => { setCustomDirty(false); setShowCustomForm(true); }} className="btn-primary gap-1.5 flex-shrink-0">
            <Icon name="plus" size={15} />
            New Budget
          </button>
        )}
      </div>

      {/* ── Tab toggle ── */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        <button
          onClick={() => setTab('monthly')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Calendar size={14} /> Monthly
        </button>
        <button
          onClick={() => setTab('custom')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${
            tab === 'custom' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          <CalendarRange size={14} /> Custom Range
        </button>
      </div>

      {/* ════════════════════ MONTHLY TAB ════════════════════ */}
      {tab === 'monthly' && (
        <>
          {/* Month navigator */}
          <div className="flex items-center justify-center gap-3">
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">‹</button>
            <div className="text-center min-w-[140px]">
              <span className="text-base font-bold text-slate-700">{MONTHS[month - 1]} {year}</span>
              {isPastMonth && (
                <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                  <Lock size={10} /> Past month — read only
                </p>
              )}
            </div>
            <button onClick={nextMonth} disabled={isAtMaxFuture}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30">›</button>
          </div>

          {loading && (
            <div className="space-y-4">
              <div className="card animate-pulse h-32 bg-slate-100" />
              <div className="card animate-pulse h-24 bg-slate-100" />
            </div>
          )}

          {!loading && !data?.hasBudget && (
            <div className="card text-center py-14 space-y-4">
              <p className="text-5xl">🎯</p>
              <p className="font-bold text-slate-700 text-lg">
                {isPastMonth ? 'No budget was set' : 'No budget set'}
              </p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                {isPastMonth
                  ? 'No budget was configured for this month.'
                  : "Set a monthly spending limit to track where your money goes."}
              </p>
              {!isPastMonth && (
                <button onClick={handleOpenEdit} className="btn-primary mx-auto">
                  Set Budget for {MONTHS[month - 1]}
                </button>
              )}
            </div>
          )}

          {!loading && data?.hasBudget && (
            <>
              {isPastMonth && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <Lock size={14} className="text-slate-400 flex-shrink-0" />
                  <p className="text-xs text-slate-500">
                    Past months are <span className="font-semibold">read-only</span>. You can view but not edit.
                  </p>
                </div>
              )}
              <OverallCard data={data} />
              {data.categoryBudgets.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 px-1">Category Budgets</p>
                  {data.categoryBudgets.map((cb) => (
                    <CategoryBudgetCard key={cb._id} item={cb} />
                  ))}
                </div>
              )}
              <AlertSummary items={data.categoryBudgets} />
            </>
          )}

          {!isPastMonth && (
            <Modal open={showEdit} onClose={handleCloseEdit}
              title={`Budget — ${MONTHS[month-1]} ${year}`}
              onBeforeClose={monthlyBeforeClose}>
              <BudgetForm
                month={month} year={year} data={data} expCats={expCats}
                onDirtyChange={setMonthlyDirty}
                onSave={async (input) => {
                  try {
                    await save(input);
                    setShowEdit(false);
                    setMonthlyDirty(false);
                    toast('Budget saved');
                  } catch { toast('Failed to save budget', 'error'); }
                }}
                onCancel={handleCloseEdit}
              />
            </Modal>
          )}
        </>
      )}

      {/* ════════════════════ CUSTOM TAB ════════════════════ */}
      {tab === 'custom' && (
        <>
          {customLoading && (
            <div className="space-y-3">
              {[1,2,3].map((i) => <div key={i} className="card animate-pulse h-32 bg-slate-100" />)}
            </div>
          )}

          {!customLoading && customBudgets.length === 0 && (
            <div className="card text-center py-14 space-y-4">
              <p className="text-5xl">📅</p>
              <p className="font-bold text-slate-700 text-lg">No custom budgets yet</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Create a budget for any date range — next 10 days, a trip, end of month, anything.
              </p>
              <button onClick={() => setShowCustomForm(true)} className="btn-primary mx-auto">
                Create Custom Budget
              </button>
            </div>
          )}

          {!customLoading && customBudgets.length > 0 && (
            <div className="space-y-3">
              {/* Active */}
              {customBudgets.filter((b) => b.isActive).length > 0 && (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">Active</p>
                  {customBudgets.filter((b) => b.isActive).map((b) => (
                    <CustomBudgetCard key={b._id} budget={b}
                      onDelete={() => handleDeleteCustom(b._id, b.name || formatDateRange(b.startDate, b.endDate))} />
                  ))}
                </>
              )}
              {/* Upcoming */}
              {customBudgets.filter((b) => b.isFuture).length > 0 && (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1 mt-2">Upcoming</p>
                  {customBudgets.filter((b) => b.isFuture).map((b) => (
                    <CustomBudgetCard key={b._id} budget={b}
                      onDelete={() => handleDeleteCustom(b._id, b.name || formatDateRange(b.startDate, b.endDate))} />
                  ))}
                </>
              )}
              {/* Past */}
              {customBudgets.filter((b) => b.isPast).length > 0 && (
                <>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1 mt-2">Past</p>
                  {customBudgets.filter((b) => b.isPast).map((b) => (
                    <CustomBudgetCard key={b._id} budget={b}
                      onDelete={() => handleDeleteCustom(b._id, b.name || formatDateRange(b.startDate, b.endDate))} />
                  ))}
                </>
              )}
            </div>
          )}

          <Modal open={showCustomForm}
            onClose={() => { setShowCustomForm(false); setCustomDirty(false); }}
            title="New Custom Budget"
            onBeforeClose={customBeforeClose}>
            <CustomBudgetForm
              expCats={expCats}
              onDirtyChange={setCustomDirty}
              onSave={async (payload) => {
                try {
                  const created = await budgetsApi.createCustom(payload);
                  setCustomBudgets((prev) => [created, ...prev]);
                  setShowCustomForm(false);
                  setCustomDirty(false);
                  toast('Custom budget created');
                } catch (e: any) {
                  toast(e.response?.data?.error ?? 'Failed to save', 'error');
                }
              }}
              onCancel={() => { setShowCustomForm(false); setCustomDirty(false); }}
            />
          </Modal>
        </>
      )}
    </div>
  );
}

/* ── Helpers ── */
function formatDateRange(start: string, end: string) {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-');
    return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m)-1]} ${y}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/* ── Monthly overall card ── */
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

/* ── Monthly category budget card ── */
function CategoryBudgetCard({ item }: { item: CategoryBudgetItem }) {
  const cfg       = STATUS[item.status];
  const remaining = item.limit - item.spent;
  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: item.color + '18' }}>{item.icon}</div>
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

/* ── Custom budget card ── */
function CustomBudgetCard({ budget, onDelete }: { budget: CustomBudgetData; onDelete: () => void }) {
  const cfg       = STATUS[budget.overallStatus];
  const remaining = budget.overallLimit - budget.totalSpent;

  const statusPill = budget.isActive
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-brand">Active</span>
    : budget.isFuture
    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Upcoming</span>
    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Ended</span>;

  return (
    <div className={`card space-y-3 ${budget.isPast ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {budget.name && <p className="font-bold text-slate-800 text-sm truncate">{budget.name}</p>}
          <p className="text-xs text-slate-500 mt-0.5">{formatDateRange(budget.startDate, budget.endDate)}</p>
          <div className="flex items-center gap-2 mt-1">
            {statusPill}
            <span className="text-[10px] text-slate-400">{budget.daysTotal} day{budget.daysTotal !== 1 ? 's' : ''}</span>
            {budget.isActive && <span className="text-[10px] text-slate-400">{budget.daysLeft} left</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${cfg.badge}`}>
            {cfg.icon}{cfg.label}
          </span>
          <button onClick={onDelete}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className={`font-semibold ${cfg.text}`}>{formatCurrency(budget.totalSpent)} spent</span>
          <span className="text-slate-400">Limit {formatCurrency(budget.overallLimit)}</span>
        </div>
        <ProgressBar pct={budget.overallPercentage} status={budget.overallStatus} />
        <div className="flex justify-between text-xs text-slate-400">
          <span>{budget.overallPercentage}% used</span>
          <span className={remaining >= 0 ? 'text-slate-500' : 'text-red-500 font-semibold'}>
            {remaining >= 0 ? `${formatCurrency(remaining)} remaining` : `${formatCurrency(Math.abs(remaining))} over`}
          </span>
        </div>
      </div>

      {budget.categoryBudgets.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          {budget.categoryBudgets.map((cb) => {
            const cs = STATUS[cb.status as BudgetStatus];
            return (
              <div key={cb._id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm w-5 text-center">{cb.icon}</span>
                  <span className="flex-1 text-xs text-slate-600 truncate">{cb.name}</span>
                  <span className="text-[10px] text-slate-400">{cb.percentage}%</span>
                  <span className="text-xs font-semibold text-slate-700">{formatCurrency(cb.spent)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden ml-7">
                  <div className={`h-full rounded-full ${cs.bar}`}
                    style={{ width: `${Math.min(cb.percentage, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Monthly budget form ── */
function BudgetForm({ month, year, data, expCats, onSave, onCancel, onDirtyChange }: {
  month: number; year: number; data: any; expCats: any[];
  onSave: (d: any) => Promise<void>; onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isDirty } } = useForm<MonthlyFormData>({
    resolver: zodResolver(monthlySchema),
    defaultValues: { overallLimit: data?.overallLimit || 0 },
  });

  const [catLimits, setCatLimits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data?.categoryBudgets?.forEach((cb: any) => { map[cb.categoryId] = String(cb.limit); });
    return map;
  });

  const [initialCatLimits] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    data?.categoryBudgets?.forEach((cb: any) => { map[cb.categoryId] = String(cb.limit); });
    return map;
  });

  const overallLimit = Number(watch('overallLimit') || 0);
  const catTotal     = Object.values(catLimits).reduce((s, v) => s + (Number(v) || 0), 0);
  const catOverflow  = catTotal > overallLimit && overallLimit > 0;

  useEffect(() => {
    const allKeys  = Object.keys({ ...catLimits, ...initialCatLimits });
    const catDirty = allKeys.some((k) => (catLimits[k] ?? '') !== (initialCatLimits[k] ?? ''));
    onDirtyChange?.(isDirty || catDirty);
  }, [isDirty, catLimits, initialCatLimits, onDirtyChange]);

  const onSubmit = async (formData: MonthlyFormData) => {
    const categoryBudgets = Object.entries(catLimits)
      .filter(([, v]) => Number(v) > 0)
      .map(([categoryId, limit]) => ({ categoryId, limit: Number(limit) }));
    await onSave({ month, year, overallLimit: formData.overallLimit, categoryBudgets });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Overall Monthly Limit (₹)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
          <input {...register('overallLimit')} type="number" step="100" className="input pl-8" placeholder="e.g. 50000" />
        </div>
        {errors.overallLimit && <p className="text-xs text-red-500">{errors.overallLimit.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Category Limits <span className="font-normal text-slate-400">(optional)</span></label>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {expCats.map((cat) => (
            <div key={cat._id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-lg w-8 text-center flex-shrink-0">{cat.icon}</span>
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{cat.name}</span>
              <div className="relative flex-shrink-0 w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input type="number" step="100" placeholder="0"
                  value={catLimits[cat._id] ?? ''}
                  onChange={(e) => setCatLimits((p) => ({ ...p, [cat._id]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white" />
              </div>
            </div>
          ))}
        </div>
        {catOverflow && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Category limits total <span className="font-bold">{formatCurrency(catTotal)}</span> which exceeds your overall limit of <span className="font-bold">{formatCurrency(overallLimit)}</span>.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</span> : 'Save Budget'}
        </button>
      </div>
    </form>
  );
}

/* ── Custom budget form ── */
function CustomBudgetForm({ expCats, onSave, onCancel, onDirtyChange }: {
  expCats:       any[];
  onSave:        (d: any) => Promise<void>;
  onCancel:      () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const today = todayStr();
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting, isDirty } } = useForm<CustomFormData>({
    resolver: zodResolver(customSchema),
    defaultValues: { name: '', startDate: today, endDate: today, overallLimit: undefined as any },
  });

  const [catLimits, setCatLimits] = useState<Record<string, string>>({});

  useEffect(() => { onDirtyChange?.(isDirty || Object.values(catLimits).some(Boolean)); }, [isDirty, catLimits, onDirtyChange]);

  const startDate    = watch('startDate');
  const overallLimit = Number(watch('overallLimit') || 0);
  const catTotal     = Object.values(catLimits).reduce((s, v) => s + (Number(v) || 0), 0);
  const catOverflow  = catTotal > overallLimit && overallLimit > 0;

  /* Quick range shortcuts */
  const applyDays = (days: number) => {
    const start = new Date(startDate || today);
    const end   = new Date(start);
    end.setDate(end.getDate() + days - 1);
    setValue('endDate', end.toISOString().split('T')[0], { shouldDirty: true });
  };

  const onSubmit = async (formData: CustomFormData) => {
    const categoryBudgets = Object.entries(catLimits)
      .filter(([, v]) => Number(v) > 0)
      .map(([categoryId, limit]) => ({ categoryId, limit: Number(limit) }));
    await onSave({
      name:         formData.name || '',
      startDate:    formData.startDate,
      endDate:      formData.endDate,
      overallLimit: formData.overallLimit,
      categoryBudgets,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Budget Name <span className="font-normal text-slate-400">(optional)</span></label>
        <input {...register('name')} type="text" placeholder="e.g. Trip to Goa, End of Month…" className="input" />
      </div>

      {/* Date range */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Date Range</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-500">From</label>
            <input {...register('startDate')} type="date" className="input text-sm" />
            {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500">To</label>
            <input {...register('endDate')} type="date" min={startDate || today} className="input text-sm" />
            {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
          </div>
        </div>

        {/* Quick range shortcuts */}
        <div className="space-y-1.5">
          <p className="text-xs text-slate-400">Quick select from start date:</p>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: '7 Days',  days: 7  },
              { label: '10 Days', days: 10 },
              { label: '15 Days', days: 15 },
              { label: '30 Days', days: 30 },
            ].map(({ label, days }) => (
              <button key={days} type="button" onClick={() => applyDays(days)}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-brand/10 hover:text-brand transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overall limit */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Overall Limit (₹)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
          <input {...register('overallLimit')} type="number" step="100" className="input pl-8" placeholder="e.g. 20000" />
        </div>
        {errors.overallLimit && <p className="text-xs text-red-500">{errors.overallLimit.message}</p>}
      </div>

      {/* Category limits */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700">Category Limits <span className="font-normal text-slate-400">(optional)</span></label>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {expCats.map((cat) => (
            <div key={cat._id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-3 py-2">
              <span className="text-lg w-8 text-center flex-shrink-0">{cat.icon}</span>
              <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{cat.name}</span>
              <div className="relative flex-shrink-0 w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                <input type="number" step="100" placeholder="0"
                  value={catLimits[cat._id] ?? ''}
                  onChange={(e) => setCatLimits((p) => ({ ...p, [cat._id]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white" />
              </div>
            </div>
          ))}
        </div>
        {catOverflow && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Category limits total <span className="font-bold">{formatCurrency(catTotal)}</span> exceeds overall limit of <span className="font-bold">{formatCurrency(overallLimit)}</span>.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</span> : 'Create Budget'}
        </button>
      </div>
    </form>
  );
}