import { NavLink, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useConfirm } from '../ui/ConfirmProvider';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard',    icon: 'dashboard'    as const, label: 'Dashboard'    },
      { to: '/transactions', icon: 'transactions' as const, label: 'Transactions' },
      { to: '/reports',      icon: 'reports'      as const, label: 'Reports'      },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/accounts',     icon: 'accounts'     as const, label: 'Accounts'     },
      { to: '/categories',   icon: 'categories'   as const, label: 'Categories'   },
      { to: '/budgets',      icon: 'budgets'      as const, label: 'Budgets'      },
      { to: '/recurring',    icon: 'recurring'    as const, label: 'Recurring'    },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/notifications', icon: 'notifications' as const, label: 'Notifications' },
      { to: '/settings',      icon: 'settings'      as const, label: 'Settings'      },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const confirm  = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title:        'Sign Out',
      message:      'Are you sure you want to sign out?',
      confirmLabel: 'Sign Out',
      danger:       false,
    });
    if (!ok) return;
    logout();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white border-r border-slate-100 px-4 py-6 fixed left-0 top-0 z-30 overflow-y-auto overflow-x-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg shadow-md shadow-emerald-100">
          M
        </div>
        <span className="text-lg font-bold text-slate-800">MoneyFlow</span>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-100 pt-4 mt-4">
        <NavLink
          to="/profile"
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <Icon name="chevron-right" size={14} className="text-slate-300 group-hover:text-slate-400" />
        </NavLink>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-red-400 hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <Icon name="logout" size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ to, icon, label }: { to: string; icon: any; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-brand/10 text-brand'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon name={icon} size={18} className={isActive ? 'text-brand' : ''} />
          {label}
        </>
      )}
    </NavLink>
  );
}
