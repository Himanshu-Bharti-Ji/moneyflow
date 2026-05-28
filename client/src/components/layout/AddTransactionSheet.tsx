import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

interface Props {
  open: boolean;
  onClose: () => void;
}

const options = [
  {
    label: 'Add Expense',
    icon: 'expense'    as const,
    color: 'bg-red-50 text-red-500',
    border: 'border-red-100',
    to: '/transactions/add?type=expense',
  },
  {
    label: 'Add Income',
    icon: 'income'     as const,
    color: 'bg-emerald-50 text-brand',
    border: 'border-emerald-100',
    to: '/transactions/add?type=income',
  },
  {
    label: 'Transfer',
    icon: 'transfer'   as const,
    color: 'bg-blue-50 text-blue-500',
    border: 'border-blue-100',
    to: '/transactions/add?type=transfer',
  },
];

export default function AddTransactionSheet({ open, onClose }: Props) {
  const navigate = useNavigate();

  if (!open) return null;

  const handle = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-10 shadow-2xl animate-slide-up">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

        <h3 className="text-base font-semibold text-slate-700 mb-4 text-center">
          Add Transaction
        </h3>

        <div className="space-y-3">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handle(opt.to)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border ${opt.border} ${opt.color} hover:opacity-80 active:scale-98 transition-all`}
            >
              <span className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center">
                <Icon name={opt.icon} size={22} />
              </span>
              <span className="font-semibold text-sm">{opt.label}</span>
              <Icon name="chevron-right" size={16} className="ml-auto opacity-40" />
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </>
  );
}
