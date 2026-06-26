// Nguồn dữ liệu duy nhất cho phân quyền theo role ở frontend.

// Các role được phép quản lý chức năng Hàng hóa (Cargo).
export const CARGO_ROLES = ['Admin', 'Master', 'ChiefOfficer'];

// Trả về dashboard tương ứng với role hiện tại.
export function getDashboardPath(role) {
  if (role === 'Master' || role === 'ChiefOfficer') return '/master-dashboard';
  if (role === 'Admin' || role === 'Agency') return '/agency-dashboard';
  return '/crew-dashboard';
}
