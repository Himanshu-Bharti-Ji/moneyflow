import {
  LayoutDashboard, Receipt, Plus, Target, Settings,
  Wallet, Tag, BarChart2, Bell, CircleUser, LogOut,
  ChevronRight, ChevronDown, X, Menu,
  TrendingUp, TrendingDown, ArrowLeftRight,
  Sun, Moon, Pencil, Trash2, Check, AlertTriangle,
  ArrowUp, ArrowDown, PauseCircle, PlayCircle, RefreshCw,
  type LucideIcon,
} from 'lucide-react';

export type IconName =
  | 'dashboard' | 'transactions' | 'plus' | 'budgets' | 'settings'
  | 'accounts' | 'categories' | 'reports' | 'notifications' | 'profile'
  | 'logout' | 'chevron-right' | 'chevron-down' | 'x' | 'menu'
  | 'income' | 'expense' | 'transfer' | 'bell' | 'sun' | 'moon'
  | 'edit' | 'trash' | 'check' | 'alert' | 'arrow-up' | 'arrow-down'
  | 'pause' | 'play' | 'recurring';

const ICONS: Record<IconName, LucideIcon> = {
  dashboard:       LayoutDashboard,
  transactions:    Receipt,
  plus:            Plus,
  budgets:         Target,
  settings:        Settings,
  accounts:        Wallet,
  categories:      Tag,
  reports:         BarChart2,
  notifications:   Bell,
  profile:         CircleUser,
  logout:          LogOut,
  'chevron-right': ChevronRight,
  'chevron-down':  ChevronDown,
  x:               X,
  menu:            Menu,
  income:          TrendingUp,
  expense:         TrendingDown,
  transfer:        ArrowLeftRight,
  bell:            Bell,
  sun:             Sun,
  moon:            Moon,
  edit:            Pencil,
  trash:           Trash2,
  check:           Check,
  alert:           AlertTriangle,
  'arrow-up':      ArrowUp,
  'arrow-down':    ArrowDown,
  pause:           PauseCircle,
  play:            PlayCircle,
  recurring:       RefreshCw,
};

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export default function Icon({ name, className = '', size = 24 }: IconProps) {
  const Comp = ICONS[name];
  return <Comp size={size} className={className} strokeWidth={1.75} />;
}
