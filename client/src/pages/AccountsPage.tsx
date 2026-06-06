import { useState } from 'react';
import { useAccounts } from '../features/accounts/useAccounts';
import AccountForm from '../features/accounts/AccountForm';
import Modal from '../components/ui/Modal';
import { useConfirm } from '../components/ui/ConfirmProvider';
import { toast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';
import { Banknote, Building2, CreditCard, Wallet as WalletIcon } from 'lucide-react';
import type { Account } from '../types';
import { formatCurrency } from '../lib/currency';

const TYPE_LABELS: Record<string, string> = {
  cash: 'Cash', bank: 'Bank Account', credit_card: 'Credit Card', wallet: 'Wallet',
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  cash:        <Banknote   size={20} strokeWidth={1.75} />,
  bank:        <Building2  size={20} strokeWidth={1.75} />,
  credit_card: <CreditCard size={20} strokeWidth={1.75} />,
  wallet:      <WalletIcon size={20} strokeWidth={1.75} />,
};

export default function AccountsPage() {
  const { accounts, loading, error, totalBalance, create, update, remove } = useAccounts();
  const confirm = useConfirm();
  const [showCreate,   setShowCreate]   = useState(false);
  const [editAccount,  setEditAccount]  = useState<Account | null>(null);
  const [formDirty,    setFormDirty]    = useState(false);

  const beforeClose = async () => {
    if (!formDirty) return true;
    return confirm({
      title: 'Discard changes?',
      message: 'You have unsaved account changes.',
      confirmLabel: 'Discard',
      cancelLabel: 'Keep editing',
    });
  };

  const handleCreate = async (data: any) => {
    try {
      await create(data);
      setShowCreate(false);
      toast('Account created');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to create account', 'error');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editAccount) return;
    try {
      // Only pass fields the update endpoint accepts; strip type/openingBalance
      const { name, color, icon, currentBalance } = data;
      await update(editAccount._id, { name, color, icon, currentBalance });
      setEditAccount(null);
      toast('Account updated');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to update account', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirm({
      title:        'Delete Account',
      message:      `Delete "${name}"?`,
      detail:       'This account can only be deleted if it has no transactions. This cannot be undone.',
      confirmLabel: 'Delete',
      danger:       true,
    });
    if (!ok) return;
    try {
      await remove(id);
      toast('Account deleted');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to delete account', 'error');
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Accounts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your financial accounts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-1.5 flex-shrink-0">
          <Icon name="plus" size={16} /> Add
        </button>
      </div>

      {/* Total balance banner */}
      <div className="rounded-2xl bg-gradient-to-br from-brand to-emerald-600 p-5 text-white">
        <p className="text-sm font-medium opacity-80">Total Balance</p>
        <p className="text-3xl font-bold mt-1 tracking-tight">{formatCurrency(totalBalance)}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
          <p className="text-xs opacity-70">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse h-20 bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="card text-center py-8 text-red-500 text-sm">{error}</div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="card text-center py-12 space-y-3">
          <p className="text-4xl">💳</p>
          <p className="font-semibold text-slate-700">No accounts yet</p>
          <p className="text-sm text-slate-400">Add your first account to start tracking</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">
            Add Account
          </button>
        </div>
      )}

      {/* Account cards */}
      {!loading && accounts.length > 0 && (
        <div className="space-y-3">
          {accounts.map((account) => (
            <AccountCard
              key={account._id}
              account={account}
              onEdit={() => setEditAccount(account)}
              onDelete={() => handleDelete(account._id, account.name)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormDirty(false); }} title="Add Account"
        onBeforeClose={beforeClose}>
        <AccountForm onSubmit={handleCreate} onCancel={() => { setShowCreate(false); setFormDirty(false); }}
          onDirtyChange={setFormDirty} />
      </Modal>

      <Modal open={!!editAccount} onClose={() => { setEditAccount(null); setFormDirty(false); }} title="Edit Account"
        onBeforeClose={beforeClose}>
        {editAccount && (
          <AccountForm
            account={editAccount}
            onSubmit={handleUpdate}
            onCancel={() => { setEditAccount(null); setFormDirty(false); }}
            onDirtyChange={setFormDirty}
          />
        )}
      </Modal>

    </div>
  );
}

function AccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const positive = account.currentBalance >= 0;

  return (
    <div className="card p-0 overflow-hidden">
      {/* Top row — icon + name + actions */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: account.color + '18', color: account.color }}
        >
          {TYPE_ICONS[account.type] ?? <WalletIcon size={20} strokeWidth={1.75} />}
        </div>

        {/* Name + type */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm leading-tight truncate">
            {account.name}
          </p>
          <span
            className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: account.color + '18', color: account.color }}
          >
            {TYPE_LABELS[account.type]}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-brand transition-colors"
          >
            <Icon name="edit" size={15} />
          </button>
          <button
            onClick={onDelete}
            className="w-8 h-8 rounded-xl hover:bg-red-50 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-50 mx-4" />

      {/* Bottom row — balance */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs text-slate-400">Current Balance</p>
        <p className={`font-bold text-lg ${positive ? 'text-slate-800' : 'text-red-500'}`}>
          {formatCurrency(account.currentBalance)}
        </p>
      </div>
    </div>
  );
}
