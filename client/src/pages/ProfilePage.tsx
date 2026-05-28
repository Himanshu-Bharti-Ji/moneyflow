import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '../stores/auth.store';
import { profileApi } from '../features/profile/profile.api';
import { useConfirm } from '../components/ui/ConfirmProvider';
import { toast } from '../components/ui/Toast';
import Icon from '../components/ui/Icon';

/* ── Schemas ── */
const profileSchema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Required'),
  newPassword:     z.string().min(6, 'At least 6 characters'),
  confirmPassword: z.string().min(1, 'Required'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ProfileForm   = z.infer<typeof profileSchema>;
type PasswordForm  = z.infer<typeof passwordSchema>;

/* ── Avatar colours by initial ── */
const AVATAR_COLORS = [
  'bg-brand/10 text-brand', 'bg-purple-100 text-purple-600',
  'bg-blue-100 text-blue-600', 'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const confirm  = useConfirm();
  const [showPwForm, setShowPwForm] = useState(false);

  /* ── Profile form ── */
  const {
    register: rP, handleSubmit: hP,
    formState: { errors: eP, isSubmitting: subP, isDirty: dirtyP },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const saveProfile = async (data: ProfileForm) => {
    try {
      const updated = await profileApi.updateProfile(data);
      setUser(updated);
      toast('Profile updated');
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to update', 'error');
    }
  };

  /* ── Password form ── */
  const {
    register: rW, handleSubmit: hW, reset: resetPw,
    formState: { errors: eW, isSubmitting: subW },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const savePassword = async (data: PasswordForm) => {
    try {
      await profileApi.changePassword(data.currentPassword, data.newPassword);
      toast('Password changed');
      resetPw();
      setShowPwForm(false);
    } catch (e: any) {
      toast(e.response?.data?.error ?? 'Failed to change password', 'error');
    }
  };

  /* ── Sign out ── */
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

  if (!user) return null;

  const initial    = user.name?.[0]?.toUpperCase() ?? 'U';
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="page max-w-lg">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your personal details</p>
      </div>

      {/* Avatar + name card */}
      <div className="card flex items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 ${avatarColor(user.name)}`}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-base truncate">{user.name}</p>
          <p className="text-sm text-slate-500 truncate">{user.email}</p>
          <p className="text-xs text-slate-400 mt-0.5">Member since {memberSince}</p>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card space-y-4">
        <p className="font-bold text-slate-800 text-sm">Edit Profile</p>
        <form onSubmit={hP(saveProfile)} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Full Name</label>
            <input {...rP('name')} className="input" placeholder="Your name" />
            {eP.name && <p className="text-xs text-red-500">{eP.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</label>
            <div className="input bg-slate-50 text-slate-400 cursor-not-allowed select-none">{user.email}</div>
            <p className="text-[11px] text-slate-400">Email cannot be changed</p>
          </div>

          <button
            type="submit"
            disabled={subP || !dirtyP}
            className="btn-primary w-full disabled:opacity-50"
          >
            {subP
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-slate-800 text-sm">Password</p>
          <button
            onClick={() => setShowPwForm((v) => !v)}
            className="text-xs font-semibold text-brand hover:underline"
          >
            {showPwForm ? 'Cancel' : 'Change'}
          </button>
        </div>

        {!showPwForm && (
          <p className="text-xs text-slate-400">••••••••••••</p>
        )}

        {showPwForm && (
          <form onSubmit={hW(savePassword)} className="space-y-3">
            {[
              { name: 'currentPassword' as const, label: 'Current Password' },
              { name: 'newPassword'     as const, label: 'New Password'     },
              { name: 'confirmPassword' as const, label: 'Confirm New Password' },
            ].map(({ name, label }) => (
              <div key={name} className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
                <input {...rW(name)} type="password" className="input" placeholder="••••••••" />
                {eW[name] && <p className="text-xs text-red-500">{eW[name]?.message}</p>}
              </div>
            ))}
            <button type="submit" disabled={subW} className="btn-primary w-full">
              {subW
                ? <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating…
                  </span>
                : 'Update Password'}
            </button>
          </form>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-2xl text-red-500 font-semibold border border-red-100 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
      >
        <Icon name="logout" size={16} />
        Sign Out
      </button>
    </div>
  );
}
