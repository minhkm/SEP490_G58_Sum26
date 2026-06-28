import { message, notification, Modal } from 'antd';

/**
 * Helper phản hồi (toast / confirm) dùng chung cho cả dự án.
 * Thay thế cho sweetalert2 (Swal.fire) và window.confirm.
 *
 * Dùng được ở mọi nơi (kể cả ngoài component) — antd v6 hỗ trợ React 19 sẵn.
 *
 * QUY ƯỚC: KHÔNG dùng Swal, window.confirm, hay tự viết toast div nữa.
 */

/** Toast thành công (góc trên màn hình, tự ẩn). */
export const notifySuccess = (content, duration = 2) =>
  message.success(content, duration);

/** Toast lỗi. */
export const notifyError = (content, duration = 3) =>
  message.error(content, duration);

/** Toast cảnh báo. */
export const notifyWarning = (content, duration = 3) =>
  message.warning(content, duration);

/** Toast thông tin. */
export const notifyInfo = (content, duration = 2) =>
  message.info(content, duration);

/** Thông báo dạng box có tiêu đề + mô tả (dùng cho nội dung dài hơn). */
export const notify = ({ type = 'info', message: title, description }) =>
  notification[type]({ message: title, description });

/**
 * Hộp thoại xác nhận. Trả về Promise<boolean>.
 * Ví dụ: if (await confirmAction({ title: '...' })) { ... }
 */
export const confirmAction = ({
  title = 'Bạn có chắc chắn?',
  content = '',
  okText = 'Đồng ý',
  cancelText = 'Hủy',
  okType = 'primary',
} = {}) =>
  new Promise((resolve) => {
    Modal.confirm({
      title,
      content,
      okText,
      cancelText,
      okType,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });

/**
 * Xác nhận hành động xóa (nút đỏ). Trả về Promise<boolean>.
 * Thay cho window.confirm('Bạn có chắc muốn xóa?').
 */
export const confirmDelete = ({
  title = 'Xác nhận xóa',
  content = 'Hành động này không thể hoàn tác.',
  okText = 'Xóa',
  cancelText = 'Hủy',
} = {}) => confirmAction({ title, content, okText, cancelText, okType: 'danger' });
