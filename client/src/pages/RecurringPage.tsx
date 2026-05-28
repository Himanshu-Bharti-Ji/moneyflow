import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRecurring }  from '../features/recurring/useRecurring';
import { useCategories } from '../features/categories/useCategories';
import { useAccounts }   from '../features/accounts/useAccounts';
import Modal             from '../components/ui/Modal';
import { useConfirm }    from '../components/ui/ConfirmProvider';
import { toast }         from '../components/ui/Toast';
import Icon              from '../components/ui/Icon';
import { CalendarDays, CalendarRange, CalendarClock, CalendarCheck } from 'lucide-react';
import { formatCurrency } from '../lib/currency';
import type { RecurringTransaction, RecurringFrequency } from '../types';

/* ── Frequency labels ── */
const FREQ_LABEL: Record<RecurringFrequency, string> = {
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
  yearly:  'Yearly',
};

const FREQ_ICON: Record<RecurringFrequency, React.ReactNode> = {
  daily:   <CalendarDays  size={12} strokeWidth={1.75} />,
  weekly:  <CalendarRange size={12} strokeWidth={1.75} />,
  monthly: <CalendarClock size={12} strokeWidth={1.75} />,
  yearly:  <CalendarCheck size={12} strokeWidth={1.75} />,
};

function todayStr() { return new Date().toISOString().split('T')[0]; }

/* ── Zod schema (client-side) ── */
const schema = z.object({
  type:       z.enum(['income', 'expense']),
  amount:     z.coerce.number().positive('Enter a valid amount'),
  accountId:  z.string().min(1, 'Select an account'),
  categoryId: z.string().optional().nullable(),
  notes:      z.string().max(200).optional(),
  frequency:  z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  startDate:  z.string().min(1, 'Select a start date'),
  endDate:    z.string().optional().nullable(),
}).refine(
  (d) => !d.endDate || new Date(d.endDate) >= new Date(d.startDate),
  { message: 'End date must be on or after start date', path: ['endDate'] }
);

type FormData = z.infer<typeof schema>;

/* ── Main page ── */
export default function RecurringPage() {
  const { items, loading, error: loadError, create, update, remove, toggle } = useRecurring();
  const confirm = useConfirm();
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState<RecurringTransaction | null>(null);
  const [formDirty, setFormDirty] = useState(false);

  const openCreate = () => { setEditing(null); setFormDirty(false); setShowForm(true); };
  const openEdit   = (r: RecurringTransaction) => { setEditing(r); setFormDirty(false); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditing(null); setFormDirty(false); };

  const handleSave = async (data: FormData) => {
    try {
      const payload = {
        ...data,
        categoryId: data.categoryId || null,
        endDate:    data.endDate    || null,
        notes:      data.notes      || '',
      };
      if (editing) {
        await update(editing._id, payload);
        toast('Updated');
      } else {
        await create(payload);
        toast('Recurring transaction added');
      }
      closeForm();
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    const ok = await confirm({
      title:        'Delete Recurring',
      message:      `Delete "${label}"?`,
      detail:       'Future transactions will no longer be auto-created. Past transactions are kept.',
      confirmLabel: 'Delete',
      danger:       true,
    });
    if (!ok) return;
    try { await remove(id); toast('Deleted'); }
    catch { toast('Failed to delete', 'error'); }
  };

  const handleToggle = async (r: RecurringTransaction) => {
    const isPausing = r.isActive;
    const label     = r.notes || 'this recurring transaction';
    const ok = await confirm({
      title:        isPausing ? 'Pause Recurring' : 'Resume Recurring',
      message:      isPausing ? `Pause "${label}"?` : `Resume "${label}"?`,
      detail:       isPausing
                      ? 'No new transactions will be created until you resume it.'
                      : 'Auto-creation will resume from the next due date.',
      confirmLabel: isPausing ? 'Pause' : 'Resume',
      danger:       false,
    });
    if (!ok) return;
    try { await toggle(r._id, r.isActive); }
    catch { toast('Failed to update', 'error'); }
  };

  const beforeClose = async () => {
    if (!formDirty) return true;
    return confirm({
      title: 'Discard changes?',
      message: 'You have unsaved changes to this recurring transaction.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
    });
  };

  const active   = items.filter((r) => r.isActive);
  const inactive = items.filter((r) => !r.isActive);

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Recurring</h1>
          <p className="text-sm text-slate-500 mt-0.5">Auto-scheduled transactions</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-1.5 flex-shrink-0">
          <Icon name="plus" size={15} />
          Add Recurring
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="card animate-pulse h-24 bg-slate-100" />)}
        </div>
      )}

      {/* Error */}
      {!loading && loadError && (
        <div className="card text-center py-8 text-red-500 text-sm">{loadError}</div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="card text-center py-14 space-y-4">
          <p className="text-5xl">🔁</p>
          <p className="font-bold text-slate-700 text-lg">No recurring transactions</p>
          <p className="text-sm text-slate-400 max-w-xs mx-auto">
            Set up automatic transactions for rent, salary, subscriptions and more.
          </p>
          <button onClick={openCreate} className="btn-primary mx-auto">Add First Recurring</button>
        </div>
      )}

      {/* Active */}
      {!loading && active.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-700 px-1">Active ({active.length})</p>
          {active.map((r) => (
            <RecurringCard key={r._id} item={r}
              onEdit={() => openEdit(r)}
              onToggle={() => handleToggle(r)}
              onDelete={() => handleDelete(r._id, r.notes || 'this transaction')} />
          ))}
        </div>
      )}

      {/* Inactive */}
      {!loading && inactive.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-slate-500 px-1">Paused ({inactive.length})</p>
          {inactive.map((r) => (
            <RecurringCard key={r._id} item={r}
              onEdit={() => openEdit(r)}
              onToggle={() => handleToggle(r)}
              onDelete={() => handleDelete(r._id, r.notes || 'this transaction')} />
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editing ? 'Edit Recurring' : 'New Recurring Transaction'}
        onBeforeClose={beforeClose}
      >
        <RecurringForm
          isNew={!editing}
          defaultValues={editing ? {
            type:       (editing.type as 'income' | 'expense'),
            amount:     editing.amount,
            accountId:  typeof editing.accountId === 'string' ? editing.accountId : (editing.accountId as any)._id,
            categoryId: editing.categoryId ? (typeof editing.categoryId === 'string' ? editing.categoryId : (editing.categoryId as any)._id) : null,
            notes:      editing.notes || '',
            frequency:  editing.frequency,
            startDate:  editing.startDate?.split('T')[0] ?? todayStr(),
            endDate:    editing.endDate ? editing.endDate.split('T')[0] : null,
          } : undefined}
          onSave={handleSave}
          onCancel={closeForm}
          onDirtyChange={setFormDirty}
        />
      </Modal>
    </div>
  );
}

/* ── Recurring card ── */
function RecurringCard({
  item, onEdit, onToggle, onDelete,
}: {
  item: RecurringTransaction;
  onEdit:   () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cat     = typeof item.categoryId === 'object' && item.categoryId ? item.categoryId as any : null;
  const acc     = typeof item.accountId  === 'object' ? item.accountId  as any : null;
  const next    = new Date(item.nextDueDate);
  // Only flag overdue after the due date is more than 24 h in the past.
  // This prevents a freshly-resumed rule (nextDueDate not yet advanced by the
  // cron worker) from immediately showing "(overdue)".
  const now     = new Date();
  const isOverdue = item.isActive && (now.getTime() - next.getTime()) > 24 * 60 * 60 * 1000;

  return (
    <div className={`card space-y-3 ${!item.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: cat?.color ? cat.color + '18' : '#6366f118' }}
        >
          {cat?.icon ?? (item.type === 'income' ? '💰' : '💸')}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-700 text-sm truncate">
              {item.notes || (cat?.name ?? (item.type === 'income' ? 'Income' : 'Expense'))}
            </p>
            <span className={`text-sm font-bold flex-shrink-0 ${item.type === 'income' ? 'text-brand' : 'text-red-500'}`}>
              {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              {FREQ_ICON[item.frequency]} {FREQ_LABEL[item.frequency]}
            </span>
            {acc && <span className="text-[11px] text-slate-400">{acc.name}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
        <div>
          <span className={`font-medium ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
            Next: {next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
          {isOverdue && <span className="ml-1 text-red-400">(overdue)</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onToggle} title={item.isActive ? 'Pause' : 'Resume'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              item.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-brand hover:bg-brand/10'
            }`}>
            <Icon name={item.isActive ? 'pause' : 'play'} size={14} />
          </button>
          <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
            <Icon name="edit" size={14} />
          </button>
          <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors">
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Form ── */
function RecurringForm({
  isNew,
  defaultValues,
  onSave,
  onCancel,
  onDirtyChange,
}: {
  isNew: boolean;
  defaultValues?: Partial<FormData>;
  onSave:         (d: FormData) => Promise<void>;
  onCancel:       () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { income: incCats, expense: expCats } = useCategories();
  const { accounts } = useAccounts();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:      'expense',
      frequency: 'monthly',
      startDate: todayStr(),
      ...defaultValues,
    },
  });

  // Notify parent of dirty state
  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty, onDirtyChange]);

  const type     = watch('type');
  const startDate = watch('startDate');
  const cats     = type === 'income' ? incCats : expCats;

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      {/* Type toggle */}
      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
        {(['expense','income'] as const).map((t) => (
          <label key={t}
            className={`flex-1 text-center py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors ${
              type === t ? (t === 'income' ? 'bg-white text-brand shadow-sm' : 'bg-white text-red-500 shadow-sm') : 'text-slate-500'
            }`}
          >
            <input {...register('type')} type="radio" value={t} className="hidden" />
            {t === 'income' ? '💰 Income' : '💸 Expense'}
          </label>
        ))}
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Amount (₹)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
          <input {...register('amount')} type="number" step="0.01" placeholder="0.00" className="input pl-8" />
        </div>
        {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
      </div>

      {/* Account */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Account</label>
        <select {...register('accountId')} className="input">
          <option value="">Select account</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.icon} {a.name}</option>)}
        </select>
        {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Category <span className="font-normal text-slate-400">(optional)</span></label>
        <select {...register('categoryId')} className="input">
          <option value="">No category</option>
          {cats.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {/* Frequency */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Frequency</label>
        <select {...register('frequency')} className="input">
          {(['daily','weekly','monthly','yearly'] as const).map((f) => (
            <option key={f} value={f}>{FREQ_LABEL[f]}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Start Date</label>
          {/* For new recurring, enforce min = today */}
          <input
            {...register('startDate')}
            type="date"
            min={isNew ? todayStr() : undefined}
            className="input"
          />
          {errors.startDate && <p className="text-xs text-red-500">{errors.startDate.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">End Date <span className="font-normal text-slate-400">(opt)</span></label>
          <input
            {...register('endDate')}
            type="date"
            min={startDate || todayStr()}
            className="input"
          />
          {errors.endDate && <p className="text-xs text-red-500">{errors.endDate.message}</p>}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Label / Notes</label>
        <input {...register('notes')} type="text" placeholder="e.g. Netflix subscription" className="input" />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
          {isSubmitting
            ? <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </span>
            : 'Save'}
        </button>
      </div>
    </form>
  );
}
