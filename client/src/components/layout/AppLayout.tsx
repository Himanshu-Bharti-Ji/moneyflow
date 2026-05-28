import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import { ConfirmProvider } from '../ui/ConfirmProvider';

export default function AppLayout() {
  return (
    <ConfirmProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50">
        {/* Desktop sidebar — hidden on mobile */}
        <Sidebar />

        {/* Main content column */}
        <div className="flex flex-col flex-1 min-w-0 md:ml-64">
          {/* Mobile top bar */}
          <TopBar />

          {/* Scrollable page area */}
          <main className="flex-1 w-full min-w-0 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-8 overflow-x-hidden">
            <Outlet />
          </main>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </ConfirmProvider>
  );
}
