import { Tag } from 'antd';

/**
 * Map trạng thái (tiếng Việt/Anh) -> màu Tag của antd, dùng chung cho mọi domain
 * (hải trình, hàng hóa, tàu, chứng chỉ...). So khớp theo từ khóa, lần khớp đầu thắng.
 *
 * Nếu một page cần màu khác với mặc định, truyền prop `color` để ghi đè.
 */
const GROUPS = [
  { color: 'red', keys: ['cancel', 'hủy', 'huỷ', 'delay', 'chậm', 'expired', 'hết hạn', 'reject', 'từ chối', 'urgent', 'khẩn'] },
  // Trạng thái tàu "ngừng hoạt động / inactive" là trung tính (không phải lỗi) -> xám 'default'.
  { color: 'default', keys: ['inactive', 'ngừng hoạt động', 'ngừng h', 'decommission'] },
  { color: 'gold', keys: ['maintenance', 'sửa chữa', 'bảo trì', 'loading', 'đang xếp', 'expiring', 'sắp hết'] },
  { color: 'blue', keys: ['completed', 'hoàn thành', 'transit', 'resolved', 'đã xử lý'] },
  { color: 'geekblue', keys: ['loaded', 'đã xếp'] },
  { color: 'cyan', keys: ['arrived', 'at anchor', 'anchored', 'neo đậu', 'registered', 'đăng ký', 'cập cảng', 'open', 'chờ xử lý'] },
  {
    color: 'green',
    keys: ['hoạt động', 'active', 'underway', 'homeward', 'in progress', 'progress', 'đang di chuyển',
      'delivered', 'đã giao', 'discharged', 'đã dỡ', 'valid', 'còn hạn'],
  },
];

export const getStatusColor = (status) => {
  const s = (status || '').toString().toLowerCase();
  for (const g of GROUPS) {
    if (g.keys.some((k) => s.includes(k))) return g.color;
  }
  return 'default'; // planning / planned / lên kế hoạch / không rõ
};

export const STATUS_TRANSLATIONS = {
  'Planning': 'Lên kế hoạch',
  'Loading': 'Đang làm hàng',
  'Loaded': 'Đã làm hàng xong',
  'Underway': 'Đang di chuyển',
  'Arrived': 'Cập bến',
  'Discharge': 'Dỡ hàng',
  'Discharged': 'Đã dỡ hàng xong',
  'Homeward Bounding': 'Đang quay về',
  'Completed': 'Hoàn thành',
  'At Anchor': 'Đang neo đậu',
  'Anchored': 'Đang neo đậu',
  'Cancelled': 'Đã hủy',
  'Active': 'Hoạt động',
  'OnVoyage': 'Đang trên hải trình',
  'Available': 'Sẵn sàng',
  'Operational': 'Hoạt động tốt',
  'Standby': 'Đang chờ',
  'Under Maintenance': 'Đang bảo trì',
  'Maintenance': 'Bảo trì',
  'Inactive': 'Ngừng hoạt động',
  'Pending': 'Chờ xử lý',
  'Resolved': 'Đã xử lý',
  'Closed': 'Đã đóng',
  'Rejected': 'Từ chối'
};

export const translateStatus = (status) => {
  if (!status) return status;
  const key = Object.keys(STATUS_TRANSLATIONS).find(k => k.toLowerCase() === status.toLowerCase());
  return key ? STATUS_TRANSLATIONS[key] : status;
};

/**
 * <StatusTag status={voyage.status} />
 * <StatusTag status={raw} text="Đang hoạt động" />   // hiển thị nhãn khác
 * <StatusTag status={raw} color="purple" />           // ghi đè màu
 */
export default function StatusTag({ status, text, color, fallback = '--', ...rest }) {
  const displayText = text ?? translateStatus(status) ?? fallback;
  return (
    <Tag color={color || getStatusColor(status)} {...rest}>
      {displayText}
    </Tag>
  );
}
