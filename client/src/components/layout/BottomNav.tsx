import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useState } from 'react';
import AddTransactionSheet from './AddTransactionSheet';

const navItems = [
  { to: '/dashboard',    icon: 'dashboard'    as const, label: 'Home'     },
  { to: '/transactions', icon: 'transactions' as const, label: 'History'  },
  { to: '/budgets',      icon: 'budgets'      as const, label: 'Budgets'  },
  { to: '/settings',     icon: 'settings'     as const, label: 'Settings' },
];

export default function BottomNav() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 md:hidden"
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 4px)' }}>
        <div className="flex items-center justify-around w-full px-1 pt-2 pb-1">

          {/* Home + History */}
          {navItems.slice(0, 2).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}

          {/* Centre FAB */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex flex-col items-center justify-center flex-shrink-0 -mt-5"
            aria-label="Add transaction"
          >
            <span className="w-14 h-14 rounded-2xl bg-brand shadow-lg shadow-emerald-200 flex items-center justify-center text-white">
              <Icon name="plus" size={26} />
            </span>
          </button>

          {/* Budgets + Settings */}
          {navItems.slice(2).map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>
      </nav>

      <AddTransactionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-1 rounded-xl transition-colors flex-1 max-w-[72px] ${
          isActive ? 'text-brand' : 'text-slate-400'
        }`
      }
    >
      <Icon name={icon} size={22} />
      <span className="text-[10px] font-medium leading-tight">{label}</span>
    </NavLink>
  );
}
