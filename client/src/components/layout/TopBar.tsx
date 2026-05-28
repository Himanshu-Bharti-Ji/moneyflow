import { useAuthStore } from '../../stores/auth.store';
import { NavLink } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useUnreadCount } from '../../features/notifications/useNotifications';

interface Props {
  title?: string;
}

export default function TopBar({ title }: Props) {
  const user  = useAuthStore((s) => s.user);
  const { count } = useUnreadCount();

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between md:hidden">
      <div className="flex items-center gap-2">
        {title ? (
          <h1 className="text-base font-bold text-slate-800">{title}</h1>
        ) : (
          <>
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-sm font-bold">M</div>
            <span className="font-bold text-slate-800">MoneyFlow</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <NavLink
          to="/notifications"
          className="relative w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
        >
          <Icon name="bell" size={20} />
          {count > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </NavLink>
        <NavLink
          to="/profile"
          className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-semibold text-sm"
        >
          {user?.name?.[0]?.toUpperCase() ?? 'U'}
        </NavLink>
      </div>
    </header>
  );
}
