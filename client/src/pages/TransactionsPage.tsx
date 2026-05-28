import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  SlidersHorizontal, Search, X, TrendingUp, TrendingDown,
  ArrowLeftRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTransactions } from '../features/transactions/useTransactions';
import { useAccounts }     from '../features/accounts/useAccounts';
import { useCategories }   from '../features/categories/useCategories';
import { useConfirm }      from '../components/ui/ConfirmProvider';
import Modal               from '../components/ui/Modal';
import { toast }           from '../components/ui/Toast';
import Icon                from '../components/ui/Icon';
import { formatCurrency }  from '../lib/currency';
import type { Transaction, Account, Category } from '../types';

/* ── Type styles ── */
const TYPE_STYLE = {
  income:   { text: 'text-brand',    bg: 'bg-emerald-50', label: 'Income',   icon: <TrendingUp    size={18} strokeWidth={1.75} className="text-brand"    /> },
  expense:  { text: 'text-red-500',  bg: 'bg-red-50',     label: 'Expense',  icon: <TrendingDown  size={18} strokeWidth={1.75} className="text-red-500"  /> },
  transfer: { text: 'text-blue-500', bg: 'bg-blue-50',    label: 'Transfer', icon: <ArrowLeftRight size={18} strokeWidth={1.75} className="text-blue-500" /> },
};

/* ── Date preset helpers ── */
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month'
  | 'last_month' | 'last_3m' | 'last_6m' | 'this_year' | 'custom' | '';

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today',      label: 'Today'       },
  { key: 'yesterday',  label: 'Yesterday'   },
  { key: 'this_week',  label: 'This Week'   },
  { key: 'last_week',  label: 'Last Week'   },
  { key: 'this_month', label: 'This Month'  },
  { key: 'last_month', label: 'Last Month'  },
  { key: 'last_3m',    label: 'Last 3 Months' },
  { key: 'last_6m',    label: 'Last 6 Months' },
  { key: 'this_year',  label: 'This Year'   },
  { key: 'custom',     label: 'Custom'      },
];

function fmt(d: Date) { return d.toISOString().split('T')[0]; }

function getPresetRange(preset: DatePreset): { startDate: string; endDate: string } | null {
  if (!preset || preset === 'custom') return null;
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (preset) {
    case 'today':
      return { startDate: fmt(new Date(y, m, d)), endDate: fmt(now) };
    case 'yesterday': {
      const yest = new Date(y, m, d - 1);
      return { startDate: fmt(yest), endDate: fmt(yest) };
    }
    case 'this_week': {
      const dow = now.getDay();
      return { startDate: fmt(new Date(y, m, d - dow)), endDate: fmt(now) };
    }
    case 'last_week': {
      const dow = now.getDay();
      const end   = new Date(y, m, d - dow - 1);
      const start = new Date(y, m, d - dow - 7);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case 'this_month':
      return { startDate: fmt(new Date(y, m, 1)), endDate: fmt(now) };
    case 'last_month':
      return { startDate: fmt(new Date(y, m - 1, 1)), endDate: fmt(new Date(y, m, 0)) };
    case 'last_3m':
      return { startDate: fmt(new Date(y, m - 2, 1)), endDate: fmt(now) };
    case 'last_6m':
      return { startDate: fmt(new Date(y, m - 5, 1)), endDate: fmt(now) };
    case 'this_year':
      return { startDate: fmt(new Date(y, 0, 1)), endDate: fmt(now) };
    default: return null;
  }
}

/* ── Filter state ── */
interface FilterState {
  type:        string;
  categoryId:  string;
  accountId:   string;
  datePreset:  DatePreset;
  startDate:   string;
  endDate:     string;
  minAmount:   string;
  maxAmount:   string;
}

const DEFAULT_FILTERS: FilterState = {
  type: '', categoryId: '', accountId: '',
  datePreset: '', startDate: '', endDate: '',
  minAmount: '', maxAmount: '',
};

/* ── Main page ── */
export default function TransactionsPage() {
  const navigate = useNavigate();
  const confirm  = useConfirm();

  const [filters,     setFilters]     = useState<FilterState>(DEFAULT_FILTERS);
  const [draftFilters,setDraftFilters]= useState<FilterState>(DEFAULT_FILTERS);
  const [showPanel,   setShowPanel]   = useState(false);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);

  const { accounts }   = useAccounts();
  const { categories } = useCategories();

  /* Resolve date range from preset or custom */
  const dateRange = useMemo(() => {
    if (filters.datePreset === 'custom') {
      return { startDate: filters.startDate, endDate: filters.endDate };
    }
    return getPresetRange(filters.datePreset) ?? { startDate: '', endDate: '' };
  }, [filters]);

  const queryFilters = useMemo(() => ({
    type:       filters.type       || undefined,
    categoryId: filters.categoryId || undefined,
    accountId:  filters.accountId  || undefined,
    startDate:  dateRange.startDate || undefined,
    endDate:    dateRange.endDate   || undefined,
    search:     search.trim()       || undefined,
    minAmount:  filters.minAmount   ? Number(filters.minAmount)  : undefined,
    maxAmount:  filters.maxAmount   ? Number(filters.maxAmount)  : undefined,
    page,
  }), [filters, dateRange, search, page]);

  const { transactions, total, pages, loading, error, remove } = useTransactions(queryFilters);

  const accountMap  = Object.fromEntries(accounts.map((a) => [a._id, a]));
  const categoryMap = Object.fromEntries(categories.map((c) => [c._id, c]));

  /* Count active non-date filters for badge */
  const activeFilterCount = [
    filters.type, filters.categoryId, filters.accountId,
    filters.datePreset, filters.minAmount, filters.maxAmount,
  ].filter(Boolean).length;

  const openPanel = () => { setDraftFilters(filters); setShowPanel(true); };
  const applyPanel = () => { setFilters(draftFilters); setPage(1); setShowPanel(false); };
  const clearAll   = () => { setFilters(DEFAULT_FILTERS); setDraftFilters(DEFAULT_FILTERS); setSearch(''); setPage(1); setShowPanel(false); };

  const removeFilter = (key: keyof FilterState) => {
    setFilters((prev) => ({ ...prev, [key]: '' }));
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Transaction', message: 'Delete this transaction?',
      detail: 'The account balance will be reversed automatically. This cannot be undone.',
      confirmLabel: 'Delete', danger: true,
    });
    if (!ok) return;
    try { await remove(id); toast('Transaction deleted'); }
    catch { toast('Failed to delete', 'error'); }
  };

  /* Active filter label chips */
  const activeChips: { label: string; key: keyof FilterState }[] = [];
  if (filters.type)        activeChips.push({ label: filters.type.charAt(0).toUpperCase() + filters.type.slice(1), key: 'type' });
  if (filters.categoryId)  activeChips.push({ label: categoryMap[filters.categoryId]?.name ?? 'Category', key: 'categoryId' });
  if (filters.accountId)   activeChips.push({ label: accountMap[filters.accountId]?.name ?? 'Account',   key: 'accountId' });
  if (filters.datePreset)  activeChips.push({ label: DATE_PRESETS.find((p) => p.key === filters.datePreset)?.label ?? 'Date', key: 'datePreset' });
  if (filters.minAmount)   activeChips.push({ label: `Min ₹${filters.minAmount}`, key: 'minAmount' });
  if (filters.maxAmount)   activeChips.push({ label: `Max ₹${filters.maxAmount}`, key: 'maxAmount' });

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} result{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/transactions/add')} className="btn-primary gap-1.5 flex-shrink-0">
          <Icon name="plus" size={16} /> Add
        </button>
      </div>

      {/* Search + Filter button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search notes…"
            className="input pl-9 py-2.5 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={openPanel}
          className={`relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
            activeFilterCount > 0
              ? 'bg-brand/10 border-brand/30 text-brand'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Date preset pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => { setFilters((p) => ({ ...p, datePreset: '' })); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${
            !filters.datePreset ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500'
          }`}
        >
          All Time
        </button>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => { setFilters((prev) => ({ ...prev, datePreset: p.key })); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${
              filters.datePreset === p.key
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {filters.datePreset === 'custom' && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-500">From</label>
              <input type="date" value={filters.startDate}
                onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
                className="input text-sm py-2" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-500">To</label>
              <input type="date" value={filters.endDate}
                min={filters.startDate || undefined}
                onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
                className="input text-sm py-2" />
            </div>
          </div>
          {filters.endDate && filters.startDate && filters.endDate < filters.startDate && (
            <p className="text-xs text-red-500 font-medium">End date must be after start date.</p>
          )}
        </div>
      )}

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {activeChips.map((chip) => (
            <span key={chip.key}
              className="flex items-center gap-1 px-2.5 py-1 bg-brand/10 text-brand rounded-full text-xs font-semibold">
              {chip.label}
              <button onClick={() => removeFilter(chip.key)} className="hover:opacity-70">
                <X size={11} />
              </button>
            </span>
          ))}
          <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500 underline underline-offset-2">
            Clear all
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-16 bg-slate-100" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && <div className="card text-center py-8 text-red-500 text-sm">{error}</div>}

      {/* Empty */}
      {!loading && !error && transactions.length === 0 && (
        <div className="card text-center py-16 space-y-3">
          <p className="text-5xl">📋</p>
          <p className="font-semibold text-slate-700">No transactions found</p>
          <p className="text-sm text-slate-400">
            {activeFilterCount > 0 || search ? 'Try changing or clearing your filters' : 'Tap + to record your first transaction'}
          </p>
          {(activeFilterCount > 0 || search) && (
            <button onClick={clearAll} className="btn-ghost mx-auto text-sm">Clear filters</button>
          )}
        </div>
      )}

      {/* Transaction list */}
      {!loading && transactions.length > 0 && (
        <TransactionGroups
          transactions={transactions}
          accountMap={accountMap}
          categoryMap={categoryMap}
          onDelete={handleDelete}
        />
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-slate-500 min-w-[80px] text-center">
            Page {page} of {pages}
          </span>
          <button disabled={page === pages} onClick={() => setPage((p) => p + 1)}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Filter panel */}
      <Modal open={showPanel} onClose={() => setShowPanel(false)} title="Filters">
        <FilterPanel
          draft={draftFilters}
          setDraft={setDraftFilters}
          accounts={accounts}
          categories={categories}
          onApply={applyPanel}
          onClear={clearAll}
        />
      </Modal>
    </div>
  );
}

/* ── Filter panel ── */
function FilterPanel({ draft, setDraft, accounts, categories, onApply, onClear }: {
  draft:      FilterState;
  setDraft:   React.Dispatch<React.SetStateAction<FilterState>>;
  accounts:   Account[];
  categories: Category[];
  onApply:    () => void;
  onClear:    () => void;
}) {
  const set = (key: keyof FilterState, val: string) =>
    setDraft((p) => ({ ...p, [key]: val }));

  const expCats = categories.filter((c) => c.type === 'expense');
  const incCats = categories.filter((c) => c.type === 'income');

  return (
    <div className="space-y-5">
      {/* Type */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transaction Type</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '',         label: 'All'      },
            { key: 'income',   label: 'Income'   },
            { key: 'expense',  label: 'Expense'  },
            { key: 'transfer', label: 'Transfer' },
          ].map((t) => (
            <button key={t.key} onClick={() => set('type', t.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                draft.type === t.key
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</p>
        <select value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)} className="input">
          <option value="">All Categories</option>
          <optgroup label="Expense">
            {expCats.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </optgroup>
          <optgroup label="Income">
            {incCats.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </optgroup>
        </select>
        {/* Transfers have no category — warn if both filters are active */}
        {draft.type === 'transfer' && draft.categoryId && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            Transfers don't have categories — this combination will return no results.
          </p>
        )}
      </div>

      {/* Account */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Account</p>
        <select value={draft.accountId} onChange={(e) => set('accountId', e.target.value)} className="input">
          <option value="">All Accounts</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.icon} {a.name}</option>)}
        </select>
      </div>

      {/* Amount range */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount Range (₹)</p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input type="number" placeholder="Min" value={draft.minAmount}
              onChange={(e) => set('minAmount', e.target.value)}
              className="input pl-7 py-2.5 text-sm" />
          </div>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <input type="number" placeholder="Max" value={draft.maxAmount}
              onChange={(e) => set('maxAmount', e.target.value)}
              className="input pl-7 py-2.5 text-sm" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button onClick={onClear} className="btn-ghost flex-1 text-red-500 hover:bg-red-50">
          Clear All
        </button>
        <button onClick={onApply} className="btn-primary flex-1">
          Apply Filters
        </button>
      </div>
    </div>
  );
}

/* ── Group by date ── */
function TransactionGroups({ transactions, accountMap, categoryMap, onDelete }: {
  transactions: Transaction[];
  accountMap:   Record<string, Account>;
  categoryMap:  Record<string, Category>;
  onDelete:     (id: string) => void;
}) {
  const groups: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    const key = format(new Date(tx.date), 'yyyy-MM-dd');
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([date, txs]) => {
        const dayNet = txs.reduce((sum, tx) => {
          if (tx.type === 'income')  return sum + tx.amount;
          if (tx.type === 'expense') return sum - tx.amount;
          return sum;
        }, 0);
        const transferTotal = txs
          .filter((tx) => tx.type === 'transfer')
          .reduce((sum, tx) => sum + tx.amount, 0);

        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {format(new Date(date + 'T12:00:00'), 'EEE, dd MMM yyyy')}
              </p>
              <div className="flex items-center gap-2">
                {transferTotal > 0 && (
                  <span className="text-xs font-medium text-blue-400">
                    {formatCurrency(transferTotal)} transfer
                  </span>
                )}
                {/* Only show net if there are income/expense txs */}
                {txs.some((tx) => tx.type !== 'transfer') && (
                  <p className={`text-xs font-bold ${dayNet >= 0 ? 'text-brand' : 'text-red-500'}`}>
                    {dayNet >= 0 ? '+' : ''}{formatCurrency(dayNet)}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {txs.map((tx) => (
                <TransactionRow key={tx._id} tx={tx}
                  accountMap={accountMap} categoryMap={categoryMap} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Single row ── */
function TransactionRow({ tx, accountMap, categoryMap, onDelete }: {
  tx:          Transaction;
  accountMap:  Record<string, Account>;
  categoryMap: Record<string, Category>;
  onDelete:    (id: string) => void;
}) {
  const style   = TYPE_STYLE[tx.type];
  const account = accountMap[typeof tx.accountId === 'string' ? tx.accountId : (tx.accountId as Account)._id];
  const cat     = tx.categoryId
    ? categoryMap[typeof tx.categoryId === 'string' ? tx.categoryId : (tx.categoryId as Category)._id]
    : null;
  const toAcc   = tx.transferAccountId
    ? accountMap[typeof tx.transferAccountId === 'string' ? tx.transferAccountId : (tx.transferAccountId as Account)._id]
    : null;

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* Icon — category emoji or lucide type icon */}
        <div className={`w-10 h-10 rounded-2xl ${style.bg} flex items-center justify-center flex-shrink-0`}>
          {cat
            ? <span className="text-lg leading-none">{cat.icon}</span>
            : style.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {cat?.name ?? (tx.type === 'transfer' ? 'Transfer' : style.label)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            {account?.name ?? '—'}
            {toAcc ? ` → ${toAcc.name}` : ''}
            {tx.notes ? ` · ${tx.notes}` : ''}
          </p>
        </div>

        {/* Amount + time in IST */}
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-sm ${style.text}`}>
            {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}
            {formatCurrency(tx.amount)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {new Date(tx.date).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </p>
        </div>

        {/* Delete */}
        <button onClick={() => onDelete(tx._id)}
          className="w-7 h-7 rounded-xl hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors flex-shrink-0">
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}
