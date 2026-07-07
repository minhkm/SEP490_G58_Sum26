import { Tag } from 'antd';

/**
 * Map trạng thái (tiếng Việt/Anh) -> màu Tag của antd, dùng chung cho mọi domain
 * (hải trình, hàng hóa, tàu, chứng chỉ...). So khớp theo từ khóa, lần khớp đầu thắng.
 *
 * Nếu một page cần màu khác với mặc định, truyền prop `color` để ghi đè.
 */
const GROUPS = [
  { color: 'red', keys: ['cancel', 'hủy', 'huỷ', 'delay', 'chậm', 'expired', 'hết hạn', 'inactive', 'ngừng', 'reject', 'từ chối', 'urgent', 'khẩn'] },
  { color: 'gold', keys: ['maintenance', 'sửa chữa', 'bảo trì', 'loading', 'đang xếp', 'expiring', 'sắp hết'] },
  { color: 'blue', keys: ['completed', 'hoàn thành', 'transit', 'resolved', 'đã xử lý'] },
  { color: 'geekblue', keys: ['loaded', 'đã xếp'] },
  { color: 'cyan', keys: ['arrived', 'at anchor', 'registered', 'đăng ký', 'cập cảng', 'open', 'chờ xử lý'] },
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

/**
 * <StatusTag status={voyage.status} />
 * <StatusTag status={raw} text="Đang hoạt động" />   // hiển thị nhãn khác
 * <StatusTag status={raw} color="purple" />           // ghi đè màu
 */
export default function StatusTag({ status, text, color, fallback = '--', ...rest }) {
  return (
    <Tag color={color || getStatusColor(status)} {...rest}>
      {text ?? status ?? fallback}
    </Tag>
  );
}
