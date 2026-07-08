// Nguồn dữ liệu duy nhất cho phân quyền theo role ở frontend.

// Các role được phép quản lý chức năng Hàng hóa (Cargo).
export const CARGO_ROLES = ['Admin', 'Master', 'ChiefOfficer'];

// Trả về dashboard tương ứng với role hiện tại.
export function getDashboardPath(role) {
  if (role === 'Master' || role === 'ChiefOfficer') return '/master-dashboard';
  if (role === 'Admin' || role === 'Agency') return '/agency-dashboard';
  return '/crew-dashboard';
}

// ===== Module Báo cáo (FT-10) =====
// Thuyền viên trên tàu được truy cập module Báo cáo (Admin/Agency trên bờ không can thiệp).
export const REPORT_ROLES = ['Master', 'ChiefOfficer', 'DeckOfficer', 'EngineOfficer', 'EngineCrew', 'Sailor'];

// FT-10 v2: phân tách quyền tạo / xử lý
export const REPORT_CREATE_ROLES = ['ChiefOfficer', 'DeckOfficer', 'EngineOfficer', 'EngineCrew', 'Sailor'];
export const REPORT_HANDLE_ROLES = ['Master', 'ChiefOfficer', 'DeckOfficer', 'EngineOfficer'];

export function canCreateReport(role) {
  return REPORT_CREATE_ROLES.includes(role);
}

export function canHandleReport(role) {
  return REPORT_HANDLE_ROLES.includes(role);
}

/**
 * Trả danh sách reportType đã lọc theo bộ phận.
 * - Routine: Xin nghỉ, Xin đổi ca, Ngoại lệ ca trực, Khác (cả 2 bộ phận)
 * - Incident Boong: Sự cố tàu + Khác
 * - Incident Máy: Hỏng hóc máy + Khác
 */
export function reportTypeOptions(department) {
  const routine = ['Leave', 'ShiftSwap', 'ShiftException', 'Other'];
  let incident;
  if (department === 'Engine') {
    incident = ['Breakdown', 'Other'];
  } else if (department === 'Deck') {
    incident = ['ShipIssue', 'Other'];
  } else {
    // Không rõ bộ phận → hiện tất cả
    incident = ['Breakdown', 'ShipIssue', 'Other'];
  }
  return { Routine: routine, Incident: incident };
}

// Thang bậc escalation — MIRROR của backend/src/configs/reportHierarchy.js
// Mỗi "rung" là một cấp; role đại diện của rung là phần tử đầu tiên.
export const REPORT_LADDERS = {
  Deck: [['Sailor'], ['DeckOfficer'], ['ChiefOfficer'], ['Master']],
  Engine: [['EngineCrew', 'Sailor'], ['EngineOfficer'], ['Master']],
};

function resolveLadder(role, department) {
  if (department === 'Engine') return REPORT_LADDERS.Engine;
  if (department === 'Deck') return REPORT_LADDERS.Deck;
  if (role === 'EngineOfficer' || role === 'EngineCrew') return REPORT_LADDERS.Engine;
  return REPORT_LADDERS.Deck;
}

// Rung kế tiếp khi Escalate; null nếu đã ở đỉnh (dùng để ẩn nút Escalate).
export function getNextHandlerRole(currentRole, department) {
  const ladder = resolveLadder(currentRole, department);
  const idx = ladder.findIndex((rung) => rung.includes(currentRole));
  if (idx === -1 || idx >= ladder.length - 1) return null;
  return ladder[idx + 1][0];
}

// Nhãn tiếng Việt cho role.
export const ROLE_LABELS = {
  Sailor: 'Thủy thủ',
  DeckOfficer: 'Sĩ quan boong',
  ChiefOfficer: 'Đại phó',
  EngineCrew: 'Thợ máy',
  EngineOfficer: 'Sĩ quan máy',
  Master: 'Thuyền trưởng',
  Admin: 'Quản trị viên',
  Agency: 'Đại lý',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}

