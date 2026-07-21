// Cấu hình ca trực dùng chung cho frontend.

// 6 ca cố định 4 tiếng (khớp với backend SHIFT_SLOTS).
export const SHIFT_SLOTS = [
  { slot: 0, label: '00:00 – 04:00' },
  { slot: 1, label: '04:00 – 08:00' },
  { slot: 2, label: '08:00 – 12:00' },
  { slot: 3, label: '12:00 – 16:00' },
  { slot: 4, label: '16:00 – 20:00' },
  { slot: 5, label: '20:00 – 24:00' },
];

// Vị trí trực theo bộ phận (nghiệp vụ chuẩn): boong có Lái tàu/Canh boong, máy có Trực máy.
export const POSITIONS_BY_DEPT = {
  Deck:   ['Lái tàu', 'Canh boong'],
  Engine: ['Trực máy'],
};

// Màu phân biệt bộ phận trên timetable (Boong = xanh nhẹ, Máy = vàng nhẹ).
export const DEPARTMENT_STYLE = {
  Deck:   { label: 'Boong', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  Engine: { label: 'Máy',   color: '#a16207', bg: '#fefce8', border: '#fde68a' },
};

// Role được phép tạo/sửa ca trực.
export const SHIFT_OFFICER_ROLES = ['DeckOfficer', 'EngineOfficer', 'ChiefEngineer'];

// Nhãn + màu trạng thái ca.
export const SHIFT_STATUS = {
  Scheduled:  { label: 'Đã lên lịch', color: '#2563eb', bg: '#dbeafe' },
  InProgress: { label: 'Đang diễn ra', color: '#d97706', bg: '#fef3c7' },
  Completed:  { label: 'Đã hoàn thành', color: '#059669', bg: '#d1fae5' },
  Cancelled:  { label: 'Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
};

// Xác định slot index từ startTime (Date) của ca.
export function slotFromStart(startTime) {
  const h = new Date(startTime).getHours();
  return Math.floor(h / 4);
}
