import { Navigate } from 'react-router-dom';
import { getDashboardPath } from '../config/roles';

/**
 * Bảo vệ route theo role.
 * - Chưa đăng nhập  -> chuyển về /login
 * - Sai role        -> chuyển về dashboard phù hợp với role hiện tại
 *
 * Cách dùng:
 *   <RequireRole allow={['Admin', 'Master', 'ChiefOfficer']}>
 *     <CargoPage />
 *   </RequireRole>
 */
export default function RequireRole({ allow = [], children }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role || '';

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(role)) {
    // Không đủ quyền: đưa về dashboard tương ứng với role của họ
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return children;
}
