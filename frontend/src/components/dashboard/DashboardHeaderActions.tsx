import { HeaderProfile } from './HeaderProfile';
import { NotificationBell } from './NotificationBell';
import { LogoutButton } from './LogoutButton';
import { ThemeToggle } from '@/components/ThemeToggle';

export function DashboardHeaderActions() {
  return (
    <div className="dashboard-header-actions flex items-center gap-2" data-testid="dashboard-header-actions">
      <HeaderProfile />
      <NotificationBell />
      <ThemeToggle />
      <LogoutButton />
    </div>
  );
}
