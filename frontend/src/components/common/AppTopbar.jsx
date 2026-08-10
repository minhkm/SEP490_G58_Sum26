import NotificationBell from '../NotificationBell';
import HelpButton from '../HelpButton';
import '../AppTopbar.css';

/**
 * Thanh trên cùng dùng chung cho mọi layout (chuông thông báo + trợ giúp +
 * thông tin người dùng + avatar). Trước đây bị copy-paste trong
 * MasterLayout / AdminLayout — nay gom về một chỗ.
 *
 * <AppTopbar name={displayName} role={displayRole} />
 */
export default function AppTopbar({ name = 'Người dùng', role = '' }) {
  return (
    <div className="app-topbar">
      <NotificationBell />
      <HelpButton />
      <div className="app-topbar-user">
        <div className="app-topbar-user-info">
          <span className="app-topbar-user-name">{name}</span>
          <span className="app-topbar-user-role">{role}</span>
        </div>
        <div className="app-topbar-avatar">
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0b1a2c&color=fff`}
            alt={name}
          />
        </div>
      </div>
    </div>
  );
}
