import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from 'recharts';
import { useReports } from '../features/reports/useReports';
import { TrendingUp, TrendingDown, PiggyBank, Percent } from 'lucide-react';
import { formatCurrency, formatCurrencyShort } from '../lib/currency';
import type { CategoryBreakdown } from '../types';

/* ── Date range presets ── */
type Preset = 'this_month' | 'last_month' | '3_months' | '6_months' | '1_year' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_month',  label: 'This Month'  },
  { key: 'last_month',  label: 'Last Month'  },
  { key: '3_months',    label: '3 Months'    },
  { key: '6_months',    label: '6 Months'    },
  { key: '1_year',      label: '1 Year'      },
  { key: 'custom',      label: 'Custom'      },
];

function presetDates(preset: Exclude<Preset, 'custom'>): { start: string; end: string } {
  const now   = new Date();
  const y     = now.getFullYear();
  const m     = now.getMonth();
  const fmt   = (d: Date) => d.toISOString().split('T')[0];

  switch (preset) {
    // Current-period presets end on TODAY, not end-of-month (avoids empty future-day bars)
    case 'this_month':
      return { start: fmt(new Date(y, m, 1)),      end: fmt(now) };
    case 'last_month':
      return { start: fmt(new Date(y, m - 1, 1)),  end: fmt(new Date(y, m, 0)) };
    case '3_months':
      return { start: fmt(new Date(y, m - 2, 1)),  end: fmt(now) };
    case '6_months':
      return { start: fmt(new Date(y, m - 5, 1)),  end: fmt(now) };
    // 1 Year = first of same month last year → today (clean 12 months)
    case '1_year':
      return { start: fmt(new Date(y - 1, m, 1)),  end: fmt(now) };
  }
}

const CHART_COLORS = [
  '#10b981','#ef4444','#3b82f6','#f59e0b',
  '#8b5cf6','#ec4899','#f97316','#06b6d4',
];

/* ── Custom tooltip ── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-lg p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-3">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-bold text-slate-700">{formatCurrencyShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ── */
export default function ReportsPage() {
  const now = new Date();
  const [preset,    setPreset]    = useState<Preset>('this_month');
  const [customStart, setCustomStart] = useState(now.toISOString().split('T')[0]);
  const [customEnd,   setCustomEnd]   = useState(now.toISOString().split('T')[0]);

  const { start, end } = useMemo(() => {
    if (preset === 'custom') return { start: customStart, end: customEnd };
    return presetDates(preset);
  }, [preset, customStart, customEnd]);

  const { data, loading } = useReports(start, end);

  const s = data?.summary;

  return (
    <div className="page">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Analyse your spending patterns</p>
      </div>

      {/* Preset pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all ${
              preset === p.key
                ? 'bg-slate-800 text-white'
                : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-500">From</label>
              <input type="date" value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="input text-sm py-2" />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-semibold text-slate-500">To</label>
              <input type="date" value={customEnd} min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="input text-sm py-2" />
            </div>
          </div>
          {customEnd && customStart && customEnd < customStart && (
            <p className="text-xs text-red-500 font-medium">End date must be after start date.</p>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => <div key={i} className="card animate-pulse h-20 bg-slate-100" />)}
          </div>
          <div className="card animate-pulse h-52 bg-slate-100" />
          <div className="card animate-pulse h-52 bg-slate-100" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Income"       value={s!.income}  color="text-brand"    bg="bg-emerald-50" icon={<TrendingUp   size={16} strokeWidth={1.75} className="text-brand"       />} />
            <SummaryCard label="Expense"      value={s!.expense} color="text-red-500"  bg="bg-red-50"     icon={<TrendingDown size={16} strokeWidth={1.75} className="text-red-500"     />} />
            <SummaryCard label="Savings"      value={s!.savings} color={s!.savings >= 0 ? 'text-blue-600' : 'text-red-500'} bg="bg-blue-50"
              icon={<PiggyBank size={16} strokeWidth={1.75} className={s!.savings >= 0 ? 'text-blue-500' : 'text-red-500'} />} />
            <SummaryCard label="Savings Rate" value={null}       color={s!.savingsRate >= 0 ? 'text-purple-600' : 'text-red-500'} bg="bg-purple-50"
              icon={<Percent size={16} strokeWidth={1.75} className="text-purple-500" />}
              badge={`${s!.savingsRate}%`} />
          </div>

          {/* Monthly bar chart */}
          {data.monthlyBreakdown.length > 0 && (
            <div className="card space-y-3">
              <p className="font-bold text-slate-800 text-sm">Income vs Expense</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthlyBreakdown} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income"  name="Income"  fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily trend area chart */}
          {data.dailyTrend.length > 1 && (
            <div className="card space-y-3">
              <p className="font-bold text-slate-800 text-sm">Daily Trend</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.dailyTrend}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date"
                    tickFormatter={(v) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth()+1}`;
                    }}
                    tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    interval="preserveStartEnd" />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area dataKey="income"  name="Income"  type="monotone" stroke="#10b981" strokeWidth={2} fill="url(#gInc)" dot={false} />
                  <Area dataKey="expense" name="Expense" type="monotone" stroke="#ef4444" strokeWidth={2} fill="url(#gExp)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Category breakdown */}
          {data.categoryBreakdown.length > 0 && (
            <div className="card space-y-4">
              <p className="font-bold text-slate-800 text-sm">Spending by Category</p>

              {/* Donut chart */}
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.categoryBreakdown}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={2}
                      dataKey="total"
                      nameKey="name"
                    >
                      {data.categoryBreakdown.map((c, i) => (
                        <Cell key={c._id} fill={c.color || CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Ranked list */}
              <CategoryList items={data.categoryBreakdown} totalExpense={s!.expense} />
            </div>
          )}

          {/* Empty state */}
          {data.monthlyBreakdown.length === 0 && data.categoryBreakdown.length === 0 && (
            <div className="card text-center py-14 space-y-3">
              <p className="text-5xl">📊</p>
              <p className="font-bold text-slate-700">No data for this period</p>
              <p className="text-sm text-slate-400">Add some transactions to see your reports.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Summary card ── */
function SummaryCard({
  label, value, color, bg, icon, badge,
}: {
  label:   string;
  value:   number | null;
  color:   string;
  bg:      string;
  icon:    React.ReactNode;
  badge?:  string;
}) {
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}>{icon}</span>
      </div>
      {badge !== undefined ? (
        <p className={`text-2xl font-bold ${color}`}>{badge}</p>
      ) : (
        <p className={`text-lg font-bold ${color} leading-tight`}>
          {value !== null ? formatCurrencyShort(value) : '—'}
        </p>
      )}
    </div>
  );
}

/* ── Category ranked list ── */
function CategoryList({ items, totalExpense }: { items: CategoryBreakdown[]; totalExpense: number }) {
  return (
    <div className="space-y-2.5">
      {items.map((c, i) => (
        <div key={c._id} className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base w-6 text-center">{c.icon}</span>
            <span className="flex-1 text-sm text-slate-700 font-medium truncate">{c.name}</span>
            <span className="text-xs text-slate-500">{c.percentage}%</span>
            <span className="text-sm font-bold text-slate-700">{formatCurrencyShort(c.total)}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden ml-8">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${totalExpense > 0 ? Math.min((c.total / totalExpense) * 100, 100) : 0}%`,
                backgroundColor: c.color || CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
