import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import AppLayout from '../components/layout/AppLayout';

import LoginPage        from '../pages/LoginPage';
import RegisterPage     from '../pages/RegisterPage';
import DashboardPage    from '../pages/DashboardPage';
import TransactionsPage    from '../pages/TransactionsPage';
import AddTransactionPage from '../pages/AddTransactionPage';
import AccountsPage     from '../pages/AccountsPage';
import CategoriesPage   from '../pages/CategoriesPage';
import BudgetsPage      from '../pages/BudgetsPage';
import ReportsPage      from '../pages/ReportsPage';
import RecurringPage    from '../pages/RecurringPage';
import NotificationsPage from '../pages/NotificationsPage';
import SettingsPage     from '../pages/SettingsPage';
import ProfilePage      from '../pages/ProfilePage';

// Forces AddTransactionPage to fully remount when ?type changes
function AddTransactionWithKey() {
  const [params] = useSearchParams();
  return <AddTransactionPage key={params.get('type') ?? 'expense'} />;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected — all share AppLayout */}
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index               element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/transactions"     element={<TransactionsPage />} />
          <Route path="/transactions/add" element={<AddTransactionWithKey />} />
          <Route path="/accounts"    element={<AccountsPage />} />
          <Route path="/categories"  element={<CategoriesPage />} />
          <Route path="/budgets"     element={<BudgetsPage />} />
          <Route path="/reports"     element={<ReportsPage />} />
          <Route path="/recurring"   element={<RecurringPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
          <Route path="/profile"     element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
