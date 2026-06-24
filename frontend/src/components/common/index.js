// Bộ component/helper dùng chung cho cả team. Import gọn:
//   import { PageHeader, StatusTag, RowActions } from '../components/common';
export { default as PageHeader } from './PageHeader';
export { default as StatusTag, getStatusColor } from './StatusTag';
export { default as RowActions } from './RowActions';

// Helper phản hồi (toast/confirm) — re-export để cùng một điểm import.
export {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  notify,
  confirmAction,
  confirmDelete,
} from '../../utils/feedback';
