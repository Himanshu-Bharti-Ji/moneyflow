import { useAuthStore } from '../stores/auth.store';
import { profileApi } from '../features/profile/profile.api';
import { toast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';
import {
  IndianRupee, Globe, Clock, KeyRound, ShieldCheck,
  PackageOpen, Database, Fingerprint, Zap, ShieldCheck as PrivacyIcon,
  CheckCircle2,
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

const THEMES: { key: Theme; label: string; icon: string; desc: string; soon?: boolean }[] = [
  { key: 'light',  label: 'Light',  icon: '☀️', desc: 'Always light'          },
  { key: 'dark',   label: 'Dark',   icon: '🌙', desc: 'Coming soon', soon: true },
  { key: 'system', label: 'System', icon: '💻', desc: 'Coming soon', soon: true },
];

function SettingsRow({ icon, label, value, children }: {
  icon:      React.ReactNode;
  label:     string;
  value?:    string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700">{label}</p>
          {value && <p className="text-xs text-slate-400 truncate">{value}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const theme = user?.theme ?? 'system';

  const setTheme = async (t: Theme) => {
    if (t === theme) return;
    try {
      const updated = await profileApi.updatePreferences({ theme: t });
      setUser(updated);
      toast(`Theme set to ${t}`);
    } catch {
      toast('Failed to update theme', 'error');
    }
  };

  return (
    <div className="page max-w-lg">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">App preferences</p>
      </div>

      {/* Theme */}
      <div className="card space-y-3">
        <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Icon name="sun" size={15} className="text-amber-500" /> Appearance
        </p>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => !t.soon && setTheme(t.key)}
              disabled={t.soon}
              className={`rounded-2xl p-3 text-center border-2 transition-all space-y-1 relative ${
                t.soon
                  ? 'border-transparent bg-slate-50 opacity-50 cursor-not-allowed'
                  : theme === t.key
                    ? 'border-brand bg-brand/5'
                    : 'border-transparent bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <p className="text-2xl">{t.icon}</p>
              <p className={`text-xs font-semibold ${!t.soon && theme === t.key ? 'text-brand' : 'text-slate-600'}`}>{t.label}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Currency & Region */}
      <div className="card space-y-1">
        <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <IndianRupee size={15} className="text-brand" /> Currency & Region
        </p>
        <SettingsRow icon={<IndianRupee size={15} />} label="Currency" value="Indian Rupee (₹ INR)">
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Fixed</span>
        </SettingsRow>
        <SettingsRow icon={<Globe size={15} />} label="Number Format" value="1,00,000.00 (Indian)">
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Fixed</span>
        </SettingsRow>
        <SettingsRow icon={<Clock size={15} />} label="Timezone" value="Asia/Kolkata (IST, UTC+5:30)">
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Fixed</span>
        </SettingsRow>
      </div>

      {/* Security */}
      <div className="card space-y-1">
        <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <ShieldCheck size={15} className="text-blue-500" /> Security
        </p>
        <SettingsRow icon={<KeyRound size={15} />} label="Password" value="Change in Profile">
          <a href="/profile" className="text-xs font-semibold text-brand">Change</a>
        </SettingsRow>
        <SettingsRow icon={<Fingerprint size={15} />} label="Two-Factor Auth" value="Not available yet">
          <span className="text-[10px] font-bold text-slate-300 bg-slate-100 px-2 py-1 rounded-lg">Soon</span>
        </SettingsRow>
      </div>

      {/* About */}
      <div className="card space-y-1">
        <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
          <PackageOpen size={15} className="text-slate-500" /> About
        </p>
        <SettingsRow icon={<PackageOpen size={15} />} label="Version"       value="MoneyFlow v1.0.0" />
        <SettingsRow icon={<Database    size={15} />} label="Data Storage"  value="MongoDB Atlas (encrypted)" />
        <SettingsRow icon={<KeyRound    size={15} />} label="Auth"          value="JWT · 7 day session" />
        <SettingsRow icon={<Zap         size={15} />} label="Stack"         value="React · Node.js · TypeScript" />
      </div>

      {/* Data & Privacy */}
      <div className="card space-y-3">
        <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <PrivacyIcon size={15} className="text-green-500" /> Data & Privacy
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your financial data is stored securely in MongoDB Atlas. Passwords are hashed with bcrypt (12 rounds). JWT tokens expire after 7 days.
        </p>
        <div className="rounded-xl bg-emerald-50 p-3 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-brand flex-shrink-0" strokeWidth={1.75} />
          <div>
            <p className="text-xs font-semibold text-slate-700">Data is private</p>
            <p className="text-[11px] text-slate-400">Only you can access your data</p>
          </div>
        </div>
      </div>
    </div>
  );
}
