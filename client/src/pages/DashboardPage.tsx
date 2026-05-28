import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, Wallet, Tag, BarChart2, RefreshCw } from 'lucide-react';
import { useAuthStore }  from '../stores/auth.store';
import { useDashboard }  from '../features/dashboard/useDashboard';
import { formatCurrency, formatCurrencyShort } from '../lib/currency';
import type { Transaction, Account, Category } from '../types';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ─── Skeleton card ─── */
function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`card animate-pulse bg-slate-100 ${className}`} />;
}

/* ─── Summary card ─── */
function SummaryCard({
  label, value, sub, bg, textColor, icon,
}: {
  label: string; value: string; sub?: string;
  bg: string; textColor: string; icon: React.ReactNode;
}) {
  return (
    <div className={`${bg} rounded-2xl p-4 space-y-2`}>
      <div className="flex items-center justify-between">
        <p className={`text-xs font-semibold ${textColor} opacity-70`}>{label}</p>
        <span className={`${textColor} opacity-80`}>{icon}</span>
      </div>
      <p className={`text-xl font-bold ${textColor} leading-tight`}>{value}</p>
      {sub && <p className={`text-[11px] ${textColor} opacity-50`}>{sub}</p>}
    </div>
  );
}

/* ─── Main page ─── */
export default function DashboardPage() {
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const now      = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, loading } = useDashboard(month, year);

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (isCurrentMonth) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  return (
    <div className="page">
      {/* Welcome + month picker */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-slate-500">Hello,</p>
          <h1 className="text-2xl font-bold text-slate-800">{user?.name?.split(' ')[0]} 👋</h1>
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl px-3 py-2">
          <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-700">‹</button>
          <span className="text-sm font-semibold text-slate-700 min-w-[80px] text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-700 disabled:opacity-30"
          >›</button>
        </div>
      </div>

      {/* Total balance hero */}
      {loading ? <SkeletonCard className="h-28" /> : (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white">
          <p className="text-sm font-medium opacity-75">Total Balance</p>
          <p className="text-4xl font-bold mt-1 tracking-tight">
            {formatCurrency(data?.totalBalance ?? 0)}
          </p>
          <p className="text-xs opacity-60 mt-2">Across all accounts</p>
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map((i) => <SkeletonCard key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard label="Income"   value={formatCurrencyShort(data?.income   ?? 0)} bg="bg-emerald-50" textColor="text-emerald-600" icon={<TrendingUp  size={18} strokeWidth={1.75} />} />
          <SummaryCard label="Expenses" value={formatCurrencyShort(data?.expense  ?? 0)} bg="bg-red-50"     textColor="text-red-500"     icon={<TrendingDown size={18} strokeWidth={1.75} />} />
          <SummaryCard label="Savings"  value={formatCurrencyShort(data?.savings  ?? 0)}
            bg={data && data.savings >= 0 ? 'bg-blue-50' : 'bg-orange-50'}
            textColor={data && data.savings >= 0 ? 'text-blue-600' : 'text-orange-500'}
            icon={<PiggyBank size={18} strokeWidth={1.75} />}
          />
        </div>
      )}

      {/* Quick access (mobile only) */}
      <div className="md:hidden">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Quick Access</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Accounts',   icon: <Wallet    size={22} strokeWidth={1.5} className="text-brand"       />, to: '/accounts'   },
            { label: 'Categories', icon: <Tag       size={22} strokeWidth={1.5} className="text-purple-500"  />, to: '/categories' },
            { label: 'Reports',    icon: <BarChart2 size={22} strokeWidth={1.5} className="text-blue-500"    />, to: '/reports'    },
            { label: 'Recurring',  icon: <RefreshCw size={22} strokeWidth={1.5} className="text-amber-500"   />, to: '/recurring'  },
          ].map((link) => (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            >
              {link.icon}
              <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 6-month area trend chart */}
      <div className="card p-4">
        <p className="text-sm font-bold text-slate-800 mb-4">6-Month Trend</p>
        {loading ? (
          <div className="h-40 bg-slate-100 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data?.trend ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => formatCurrencyShort(v)} />
              <Tooltip
                formatter={(val: number, name: string) => [formatCurrency(val), name === 'income' ? 'Income' : 'Expense']}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="income"  stroke="#10b981" strokeWidth={2} fill="url(#gIncome)"  dot={false} />
              <Area type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} fill="url(#gExpense)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center gap-4 mt-3 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-1 rounded bg-emerald-500 inline-block" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-3 h-1 rounded bg-red-400 inline-block" /> Expense
          </span>
        </div>
      </div>

      {/* Category pie chart */}
      {!loading && (data?.categoryBreakdown?.length ?? 0) > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold text-slate-800 mb-4">Spending by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data!.categoryBreakdown}
                cx="50%" cy="50%"
                innerRadius={55} outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data!.categoryBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => [formatCurrency(val)]}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Category legend */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {data!.categoryBreakdown.map((c) => (
              <div key={c._id} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-xs text-slate-600 truncate">{c.icon} {c.name}</span>
                <span className="text-xs font-semibold text-slate-700 ml-auto flex-shrink-0">
                  {formatCurrencyShort(c.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-slate-800">Recent Transactions</p>
          <button onClick={() => navigate('/transactions')} className="text-xs text-brand font-semibold hover:underline">
            See all
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (data?.recent?.length ?? 0) === 0 ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-3xl">📋</p>
            <p className="text-sm text-slate-400">No transactions yet</p>
            <button onClick={() => navigate('/transactions/add')} className="btn-primary mx-auto text-xs px-3 py-2">
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {data!.recent.map((tx) => (
              <RecentRow key={tx._id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Recent transaction row ─── */
function RecentRow({ tx }: { tx: Transaction }) {
  const TYPE_STYLE = {
    income:   { text: 'text-brand',    bg: 'bg-emerald-50', prefix: '+' },
    expense:  { text: 'text-red-500',  bg: 'bg-red-50',     prefix: '−' },
    transfer: { text: 'text-blue-500', bg: 'bg-blue-50',    prefix: '' },
  };
  const style   = TYPE_STYLE[tx.type];
  const cat     = tx.categoryId && typeof tx.categoryId !== 'string' ? tx.categoryId as Category : null;
  const account = tx.accountId  && typeof tx.accountId  !== 'string' ? tx.accountId  as Account  : null;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center text-base flex-shrink-0`}>
        {cat ? (cat as any).icon : tx.type === 'transfer' ? '🔄' : tx.type === 'income' ? '💰' : '💸'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">
          {cat ? (cat as any).name : tx.type === 'transfer' ? 'Transfer' : tx.type}
        </p>
        <p className="text-[11px] text-slate-400 truncate">
          {account ? (account as any).name : ''} · {new Date(tx.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
          {' '}{new Date(tx.date).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })}
        </p>
      </div>
      <p className={`text-sm font-bold ${style.text} flex-shrink-0`}>
        {style.prefix}{formatCurrency(tx.amount)}
      </p>
    </div>
  );
}
